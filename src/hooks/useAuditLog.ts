import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { Json } from '@/integrations/supabase/types';

export interface AuditLogEntry {
  id: string;
  user_id: string;
  item_id: string | null;
  action: string;
  item_name: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  created_at: string;
}

export function useAuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLogs = async () => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data as AuditLogEntry[]);
    } catch (error) {
      logger.error('AuditLog', 'Error fetching audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const logAction = async (
    action: 'create' | 'update' | 'delete' | 'batch_update' | 'batch_delete',
    itemId: string | null,
    itemName: string | null,
    changes?: Record<string, { old: unknown; new: unknown }>
  ) => {
    if (!user) return;

    try {
      await supabase.from('audit_log').insert([{
        user_id: user.id,
        item_id: itemId,
        action,
        item_name: itemName,
        changes: (changes || null) as Json,
      }]);
    } catch (error) {
      logger.error('AuditLog', 'Error logging action', error);
    }
  };

  return {
    logs,
    loading,
    logAction,
    refetch: fetchLogs,
  };
}
