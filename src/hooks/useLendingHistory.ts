import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { inventoryKeys } from '@/hooks/useInventory';
import { logger } from '@/lib/logger';
import { toLocalDateString } from '@/lib/utils';
import i18n from '@/i18n';

export interface LendingRecord {
  id: string;
  user_id: string;
  item_id: string;
  item_name: string;
  lent_to: string;
  lent_at: string;
  due_date: string | null;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
}

export function useLendingHistory() {
  const { user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [records, setRecords] = useState<LendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Guards against out-of-order responses and state updates after unmount
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchRecords = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => mountedRef.current && requestId === requestIdRef.current;

    if (!userId) {
      if (isCurrent()) { setRecords([]); setLoading(false); }
      return;
    }
    if (!navigator.onLine) {
      if (isCurrent()) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lending_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (isCurrent()) { setRecords((data as LendingRecord[]) || []); setError(null); }
    } catch (err) {
      if (isCurrent()) setError(err instanceof Error ? err : new Error(String(err)));
      logger.error('useLendingHistory', 'Failed to load lending history', err);
      const isNetworkError = err instanceof Error && err.message.includes('Failed to fetch');
      if (!isNetworkError && isCurrent()) {
        toast({
          title: i18n.t('common.error'),
          description: i18n.t('lending.load_failed', { defaultValue: 'Verleihhistorie konnte nicht geladen werden.' }),
          variant: 'destructive',
        });
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  /** The lending record is the source of truth; a failed item-status sync is reported but not fatal. */
  const syncItemStatus = async (
    itemId: string,
    patch: { condition: 'verliehen' | 'verfügbar'; lent_to: string | null; lent_until: string | null },
  ) => {
    const { error } = await supabase.from('inventory_items').update(patch).eq('id', itemId);
    if (error) {
      logger.error('useLendingHistory', 'Failed to update item status', error, { itemId });
      toast({
        title: i18n.t('common.error'),
        description: i18n.t('lending.item_status_update_failed', {
          defaultValue: 'Der Status des Artikels konnte nicht aktualisiert werden.',
        }),
        variant: 'destructive',
      });
    }
    // Other screens cache inventory via TanStack Query – make them pick up the change
    await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  };

  const addRecord = async (record: Omit<LendingRecord, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('lending_history')
        .insert({ ...record, user_id: user.id });
      if (error) throw error;
    } catch (err) {
      logger.error('useLendingHistory', 'Failed to add lending record', err);
      toast({ title: i18n.t('common.error'), description: i18n.t('feedback.loan_save_failed'), variant: 'destructive' });
      throw err;
    }

    // Auto-set inventory item to 'verliehen'
    await syncItemStatus(record.item_id, {
      condition: 'verliehen',
      lent_to: record.lent_to,
      lent_until: record.due_date,
    });

    await fetchRecords();
    toast({ title: i18n.t('feedback.loan_created'), description: i18n.t('feedback.loan_created_desc', { item: record.item_name, person: record.lent_to }) });
  };

  const markReturned = async (id: string) => {
    // Find the record to get item_id
    const record = records.find(r => r.id === id);
    try {
      const { error } = await supabase
        .from('lending_history')
        .update({ returned_at: toLocalDateString() })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      logger.error('useLendingHistory', 'Failed to mark record as returned', err);
      toast({ title: i18n.t('common.error'), description: i18n.t('feedback.return_failed'), variant: 'destructive' });
      throw err;
    }

    // Auto-set inventory item back to 'verfügbar'
    if (record) {
      await syncItemStatus(record.item_id, { condition: 'verfügbar', lent_to: null, lent_until: null });
    }

    await fetchRecords();
    toast({ title: i18n.t('feedback.return_recorded'), description: i18n.t('feedback.return_recorded_desc') });
  };

  const deleteRecord = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('lending_history')
      .delete()
      .eq('id', id);
    if (deleteError) {
      logger.error('useLendingHistory', 'Failed to delete lending record', deleteError);
      toast({ title: i18n.t('common.error'), description: i18n.t('feedback.delete_failed'), variant: 'destructive' });
      throw deleteError;
    }
    await fetchRecords();
  };

  const activeLoans = useMemo(() => records.filter(r => !r.returned_at), [records]);
  const overdueLoans = useMemo(() => {
    const today = toLocalDateString();
    return activeLoans.filter(r => r.due_date && r.due_date < today);
  }, [activeLoans]);
  const completedLoans = useMemo(() => records.filter(r => r.returned_at), [records]);

  const getItemHistory = useCallback((itemId: string) => {
    return records.filter(r => r.item_id === itemId);
  }, [records]);

  return {
    records,
    loading,
    error,
    activeLoans,
    overdueLoans,
    completedLoans,
    addRecord,
    markReturned,
    deleteRecord,
    getItemHistory,
    refetch: fetchRecords,
  };
}
