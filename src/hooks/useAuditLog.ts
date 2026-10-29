import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import i18n from '@/i18n';

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
  const userId = user?.id;
  const { toast } = useToast();

  // Guards against out-of-order responses and state updates after unmount
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchLogs = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => mountedRef.current && requestId === requestIdRef.current;

    if (!userId) {
      if (isCurrent()) { setLogs([]); setLoading(false); }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (isCurrent()) setLogs((data ?? []) as AuditLogEntry[]);
    } catch (err) {
      logger.error('AuditLog', 'Failed to load audit log', err);
      const isNetworkError = err instanceof Error && err.message.includes('Failed to fetch');
      if (!isNetworkError && isCurrent()) {
        toast({
          title: i18n.t('common.error'),
          description: i18n.t('feedback.audit_load_failed'),
          variant: 'destructive',
        });
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const logAction = async (
    action: 'create' | 'update' | 'delete' | 'batch_update' | 'batch_delete',
    itemId: string | null,
    itemName: string | null,
    changes?: Record<string, { old: unknown; new: unknown }>
  ) => {
    if (!user) return;

    const { error } = await supabase.from('audit_log').insert([{
      user_id: user.id,
      item_id: itemId,
      action,
      item_name: itemName,
      changes: (changes || null) as Json,
    }]);
    if (error) logger.error('AuditLog', 'Error logging action', error);
  };

  return {
    logs,
    loading,
    logAction,
    refetch: fetchLogs,
  };
}
