import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface QueuedOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data?: Record<string, unknown>;
  itemId?: string;
  timestamp: number;
}

const QUEUE_KEY = 'offline_queue';
const CACHE_KEY = 'offline_cache';

export const offlineQueue = {
  getQueue(): QueuedOperation[] {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
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
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    logger.info('offlineQueue', 'Operation queued', { type: operation.type, table: operation.table });
    return newOp;
  },

  removeFromQueue(id: string) {
    const queue = this.getQueue().filter(op => op.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  clearQueue() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
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

  // Sync queued operations when back online
  async syncQueue(onProgress?: (synced: number, total: number) => void): Promise<{ success: number; failed: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { success: 0, failed: 0 };

    let success = 0;
    let failed = 0;

    for (let i = 0; i < queue.length; i++) {
      const op = queue[i];
      try {
        await this.executeOperation(op);
        this.removeFromQueue(op.id);
        success++;
        logger.info('offlineQueue', 'Operation synced', { type: op.type, id: op.id });
      } catch (error) {
        failed++;
        logger.error('offlineQueue', 'Sync failed for operation', { op, error });
      }
      onProgress?.(i + 1, queue.length);
    }

    return { success, failed };
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
        if (!response.ok) throw new Error(`Insert failed: ${response.statusText}`);
        break;
      }
      case 'update': {
        if (!op.itemId) throw new Error('No itemId for update');
        const response = await fetch(`${supabaseUrl}/rest/v1/${op.table}?id=eq.${encodeURIComponent(op.itemId)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(op.data),
        });
        if (!response.ok) throw new Error(`Update failed: ${response.statusText}`);
        break;
      }
      case 'delete': {
        if (!op.itemId) throw new Error('No itemId for delete');
        const response = await fetch(`${supabaseUrl}/rest/v1/${op.table}?id=eq.${encodeURIComponent(op.itemId)}`, {
          method: 'DELETE',
          headers,
        });
        if (!response.ok) throw new Error(`Delete failed: ${response.statusText}`);
        break;
      }
    }
  },
};
