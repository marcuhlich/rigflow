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
      const enriched: EventSetWithItems[] = ((setsRes.data || []) as EventSet[]).map(s => ({
        ...s,
        items: setItems
          .filter(si => si.set_id === s.id)
          .map(si => {
            const invItem = inv.find(i => i.id === si.item_id);
            return {
              ...si,
              item_name: invItem?.name,
              item_category: invItem?.category,
              item_location: invItem?.location,
              available_quantity: invItem ? invItem.condition === 'verfügbar' ? invItem.quantity : 0 : 0,
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

  const createSet = async (name: string, description: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('event_sets')
      .insert({ name, description: description || null, user_id: user.id })
      .select()
      .single();
    if (error) { toast({ title: 'Fehler', description: 'Set konnte nicht erstellt werden.', variant: 'destructive' }); throw error; }
    await fetchSets();
    return data as EventSet;
  };

  const updateSet = async (id: string, name: string, description: string) => {
    const { error } = await supabase.from('event_sets').update({ name, description: description || null }).eq('id', id);
    if (error) { toast({ title: 'Fehler', description: 'Set konnte nicht aktualisiert werden.', variant: 'destructive' }); throw error; }
    await fetchSets();
  };

  const deleteSet = async (id: string) => {
    const { error } = await supabase.from('event_sets').delete().eq('id', id);
    if (error) { toast({ title: 'Fehler', description: 'Set konnte nicht gelöscht werden.', variant: 'destructive' }); throw error; }
    await fetchSets();
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
    sets, loading, inventoryItems, createSet, updateSet, deleteSet,
    addItemToSet, updateSetItemQuantity, removeItemFromSet, refetch: fetchSets,
  };
}
