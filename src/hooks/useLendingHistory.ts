import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [records, setRecords] = useState<LendingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lending_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords((data as LendingRecord[]) || []);
    } catch (err) {
      console.error('Failed to fetch lending history', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const addRecord = async (record: Omit<LendingRecord, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('lending_history')
        .insert({ ...record, user_id: user.id });
      if (error) throw error;

      // Auto-set inventory item to 'verliehen'
      await supabase
        .from('inventory_items')
        .update({
          condition: 'verliehen' as any,
          lent_to: record.lent_to,
          lent_until: record.due_date,
        })
        .eq('id', record.item_id);

      await fetchRecords();
      toast({ title: 'Verleih erfasst', description: `${record.item_name} an ${record.lent_to} verliehen.` });
    } catch (err) {
      toast({ title: 'Fehler', description: 'Verleih konnte nicht gespeichert werden.', variant: 'destructive' });
    }
  };

  const markReturned = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lending_history')
        .update({ returned_at: new Date().toISOString().split('T')[0] })
        .eq('id', id);
      if (error) throw error;
      await fetchRecords();
      toast({ title: 'Rückgabe erfasst', description: 'Artikel wurde als zurückgegeben markiert.' });
    } catch (err) {
      toast({ title: 'Fehler', description: 'Rückgabe konnte nicht erfasst werden.', variant: 'destructive' });
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lending_history')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchRecords();
    } catch (err) {
      toast({ title: 'Fehler', description: 'Eintrag konnte nicht gelöscht werden.', variant: 'destructive' });
    }
  };

  const activeLoans = useMemo(() => records.filter(r => !r.returned_at), [records]);
  const overdueLoans = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return activeLoans.filter(r => r.due_date && r.due_date < today);
  }, [activeLoans]);
  const completedLoans = useMemo(() => records.filter(r => r.returned_at), [records]);

  const getItemHistory = useCallback((itemId: string) => {
    return records.filter(r => r.item_id === itemId);
  }, [records]);

  return {
    records,
    loading,
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
