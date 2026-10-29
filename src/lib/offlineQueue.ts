import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface QueuedOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data?: Record<string, unknown>;
  itemId?: string;
  timestamp: number;
  /** Number of failed sync attempts */
  attempts?: number;
  lastError?: string;
}

let syncInFlight: Promise<{ success: number; failed: number }> | null = null;

/** Row identity for ordering guarantees (inserts carry their id in data). */
function rowKeyOf(op: QueuedOperation): string | null {
  const id = op.itemId ?? (typeof op.data?.id === 'string' ? op.data.id : undefined);
  return id ? `${op.table}:${id}` : null;
}

const QUEUE_KEY = 'offline_queue';

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 200);
  } catch {
    return response.statusText;
  }
}
const CACHE_KEY = 'offline_cache';

export const offlineQueue = {
  getQueue(): QueuedOperation[] {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? (parsed as QueuedOperation[]) : [];
    } catch (error) {
      logger.error('offlineQueue', 'Queue could not be read', error);
      return [];
    }
  },

  saveQueue(queue: QueuedOperation[]) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      // e.g. QuotaExceededError – surface it instead of silently losing the operation
      logger.error('offlineQueue', 'Queue could not be saved', error);
      throw error;
    }
  },

  addToQueue(operation: Omit<QueuedOperation, 'id' | 'timestamp'>) {
    const queue = this.getQueue();
    const newOp: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    queue.push(newOp);
    this.saveQueue(queue);
    logger.info('offlineQueue', 'Operation queued', { type: operation.type, table: operation.table });
    return newOp;
  },

  removeFromQueue(id: string) {
    // Re-read so operations queued while a sync was running are kept
    this.saveQueue(this.getQueue().filter(op => op.id !== id));
  },

  clearQueue() {
    this.saveQueue([]);
  },

  hasPendingOperations(): boolean {
    return this.getQueue().length > 0;
  },

  getPendingCount(): number {
    return this.getQueue().length;
  },

  // Cache for offline data
  getCache<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(`${CACHE_KEY}_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  setCache<T>(key: string, data: T) {
    try {
      localStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(data));
    } catch (error) {
      logger.error('offlineQueue', 'Cache write error', error);
    }
  },

  /**
   * Sync queued operations when back online.
   * Concurrent calls share the same in-flight run, so no operation is executed twice.
   * Failed operations stay in the queue (with a retry counter) and are retried on the next sync.
   * Operations are processed in order; once one fails, later operations on the same row are
   * skipped for this run so an update can't overtake its (failed) insert.
   */
  syncQueue(onProgress?: (synced: number, total: number) => void): Promise<{ success: number; failed: number }> {
    if (syncInFlight) return syncInFlight;
    syncInFlight = this.runSync(onProgress).finally(() => { syncInFlight = null; });
    return syncInFlight;
  },

  async runSync(onProgress?: (synced: number, total: number) => void): Promise<{ success: number; failed: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { success: 0, failed: 0 };

    let success = 0;
    let failed = 0;
    const blockedRows = new Set<string>();

    for (let i = 0; i < queue.length; i++) {
      const op = queue[i];
      const rowKey = rowKeyOf(op);
      if (rowKey && blockedRows.has(rowKey)) {
        failed++;
        onProgress?.(i + 1, queue.length);
        continue;
      }
      try {
        await this.executeOperation(op);
        this.removeFromQueue(op.id);
        success++;
        logger.info('offlineQueue', 'Operation synced', { type: op.type, id: op.id });
      } catch (error) {
        failed++;
        if (rowKey) blockedRows.add(rowKey);
        this.markFailed(op.id, error);
        logger.error('offlineQueue', 'Sync failed for operation', error, { type: op.type, table: op.table, id: op.id });
      }
      onProgress?.(i + 1, queue.length);
    }

    return { success, failed };
  },

  markFailed(id: string, error: unknown) {
    const queue = this.getQueue().map(op =>
      op.id === id
        ? { ...op, attempts: (op.attempts ?? 0) + 1, lastError: error instanceof Error ? error.message : String(error) }
        : op
    );
    this.saveQueue(queue);
  },

  isSyncing(): boolean {
    return syncInFlight !== null;
  },

  async executeOperation(op: QueuedOperation): Promise<void> {
    // Validate table name against allowlist
    const ALLOWED_TABLES = ['inventory_items', 'audit_log', 'checklists', 'checklist_items', 'event_sets', 'event_set_items'] as const;
    if (!ALLOWED_TABLES.includes(op.table as typeof ALLOWED_TABLES[number])) {
      throw new Error(`Invalid table: ${op.table}`);
    }

    // Validate itemId format if present
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (op.itemId && !UUID_REGEX.test(op.itemId)) {
      throw new Error(`Invalid item ID format`);
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    const headers = {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || supabaseKey}`,
      'Prefer': 'return=minimal',
    };

    switch (op.type) {
      case 'insert': {
        const response = await fetch(`${supabaseUrl}/rest/v1/${op.table}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(op.data),
        });
        if (!response.ok) {
          const body = await safeText(response);
          // Primary-key conflict = a previous attempt already succeeded (response was lost) → done
          if (response.status === 409 && body.includes('23505') && body.includes('_pkey')) {
            logger.warn('offlineQueue', 'Insert already applied, dropping operation', { id: op.id });
            break;
          }
          throw new Error(`Insert failed: ${response.status} ${body}`);
        }
        break;
      }
      case 'update': {
        if (!op.itemId) throw new Error('No itemId for update');
        const response = await fetch(`${supabaseUrl}/rest/v1/${op.table}?id=eq.${encodeURIComponent(op.itemId)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(op.data),
        });
        if (!response.ok) throw new Error(`Update failed: ${response.status} ${await safeText(response)}`);
        break;
      }
      case 'delete': {
        if (!op.itemId) throw new Error('No itemId for delete');
        const response = await fetch(`${supabaseUrl}/rest/v1/${op.table}?id=eq.${encodeURIComponent(op.itemId)}`, {
          method: 'DELETE',
          headers,
        });
        if (!response.ok) throw new Error(`Delete failed: ${response.status} ${await safeText(response)}`);
        break;
      }
    }
  },
};
