import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { EventSet, EventSetItem, EventSetWithItems } from '@/types/eventSet';
import { InventoryItem } from '@/types/inventory';

export function useEventSets() {
  const [sets, setSets] = useState<EventSetWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSets = useCallback(async () => {
    if (!user) { setSets([]); setLoading(false); return; }
    try {
      const [setsRes, itemsRes, invRes] = await Promise.all([
        supabase.from('event_sets').select('*').order('created_at', { ascending: false }),
        supabase.from('event_set_items').select('*'),
        supabase.from('inventory_items').select('*'),
      ]);

      if (setsRes.error) throw setsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (invRes.error) throw invRes.error;

      const inv = (invRes.data || []) as InventoryItem[];
      setInventoryItems(inv);

      const setItems = (itemsRes.data || []) as EventSetItem[];
      
      // Helper: check if two date ranges overlap
      const datesOverlap = (aStart: string | null, aEnd: string | null, bStart: string | null, bEnd: string | null): boolean => {
        if (!aStart && !bStart) return true; // both have no dates → consider overlapping
        if (!aStart || !bStart) return true; // one has no dates → conservatively consider overlapping
        const as = aStart;
        const ae = aEnd || aStart;
        const bs = bStart;
        const be = bEnd || bStart;
        return as <= be && bs <= ae;
      };

      const enriched: EventSetWithItems[] = ((setsRes.data || []) as EventSet[]).map(s => ({
        ...s,
        is_favorite: (s as any).is_favorite ?? false,
        items: setItems
          .filter(si => si.set_id === s.id)
          .map(si => {
            const invItem = inv.find(i => i.id === si.item_id);
            const totalStock = invItem ? invItem.quantity : 0;

            // Calculate how many of this item are reserved by OTHER sets with overlapping dates
            const reservedByOthers = ((setsRes.data || []) as EventSet[])
              .filter(otherSet => otherSet.id !== s.id && datesOverlap(
                s.event_date_start ?? null, s.event_date_end ?? null,
                otherSet.event_date_start ?? null, otherSet.event_date_end ?? null
              ))
              .reduce((sum, otherSet) => {
                const otherItems = setItems.filter(osi => osi.set_id === otherSet.id && osi.item_id === si.item_id);
                return sum + otherItems.reduce((s2, osi) => s2 + osi.quantity, 0);
              }, 0);

            // Also subtract items that are currently lent out
            const lentReduction = invItem?.condition === 'verliehen' ? totalStock : 0;

            return {
              ...si,
              item_name: invItem?.name,
              item_category: invItem?.category,
              item_location: invItem?.location,
              available_quantity: Math.max(0, totalStock - reservedByOthers - lentReduction),
            };
          }),
      }));
      setSets(enriched);
    } catch (error) {
      toast({ title: 'Fehler', description: 'Sets konnten nicht geladen werden.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchSets(); }, [fetchSets]);

  const createSet = async (name: string, description: string, dateStart?: string | null, dateEnd?: string | null, notes?: string | null) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('event_sets')
      .insert({
        name,
        description: description || null,
        user_id: user.id,
        event_date_start: dateStart || null,
        event_date_end: dateEnd || null,
        notes: notes || null,
      } as any)
      .select()
      .single();
    if (error) { toast({ title: 'Fehler', description: 'Set konnte nicht erstellt werden.', variant: 'destructive' }); throw error; }
    await fetchSets();
    return data as EventSet;
  };

  const updateSet = async (id: string, updates: { name?: string; description?: string; event_date_start?: string | null; event_date_end?: string | null; is_favorite?: boolean; notes?: string | null }) => {
    const cleanUpdates: any = {};
    if (updates.name !== undefined) cleanUpdates.name = updates.name;
    if (updates.description !== undefined) cleanUpdates.description = updates.description || null;
    if (updates.event_date_start !== undefined) cleanUpdates.event_date_start = updates.event_date_start || null;
    if (updates.event_date_end !== undefined) cleanUpdates.event_date_end = updates.event_date_end || null;
    if (updates.is_favorite !== undefined) cleanUpdates.is_favorite = updates.is_favorite;
    if (updates.notes !== undefined) cleanUpdates.notes = updates.notes || null;
    
    const { error } = await supabase.from('event_sets').update(cleanUpdates).eq('id', id);
    if (error) { toast({ title: 'Fehler', description: 'Set konnte nicht aktualisiert werden.', variant: 'destructive' }); throw error; }
    await fetchSets();
  };

  const deleteSet = async (id: string) => {
    const { error } = await supabase.from('event_sets').delete().eq('id', id);
    if (error) { toast({ title: 'Fehler', description: 'Set konnte nicht gelöscht werden.', variant: 'destructive' }); throw error; }
    await fetchSets();
  };

  const toggleFavorite = async (id: string) => {
    const set = sets.find(s => s.id === id);
    if (!set) return;
    await updateSet(id, { is_favorite: !set.is_favorite });
  };

  const addItemToSet = async (setId: string, itemId: string, quantity: number) => {
    const { error } = await supabase.from('event_set_items').insert({ set_id: setId, item_id: itemId, quantity });
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Hinweis', description: 'Artikel ist bereits im Set enthalten.' });
      } else {
        toast({ title: 'Fehler', description: 'Artikel konnte nicht hinzugefügt werden.', variant: 'destructive' });
      }
      throw error;
    }
    await fetchSets();
  };

  const updateSetItemQuantity = async (setItemId: string, quantity: number) => {
    const { error } = await supabase.from('event_set_items').update({ quantity }).eq('id', setItemId);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchSets();
  };

  const removeItemFromSet = async (setItemId: string) => {
    const { error } = await supabase.from('event_set_items').delete().eq('id', setItemId);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchSets();
  };

  return {
    sets, loading, inventoryItems, createSet, updateSet, deleteSet, toggleFavorite,
    addItemToSet, updateSetItemQuantity, removeItemFromSet, refetch: fetchSets,
  };
}
