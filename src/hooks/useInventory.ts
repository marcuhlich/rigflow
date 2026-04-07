import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { InventoryItem, ItemCategory, ItemCondition } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Json } from '@/integrations/supabase/types';
import { offlineQueue } from '@/lib/offlineQueue';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useNotifications } from '@/hooks/useNotifications';
import { hapticFeedback } from '@/lib/utils';

const ITEMS_CACHE_KEY = 'inventory_items';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [trashedItems, setTrashedItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<ItemCondition | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
  const { notifySync, notifyError, notifyOffline, notifyOnline } = useNotifications();

  const logAudit = async (
    action: string,
    itemId: string | null,
    itemName: string | null,
    changes?: Record<string, { old: unknown; new: unknown }>
  ) => {
    if (!user) return;
    const auditData = {
      user_id: user.id,
      item_id: itemId,
      action,
      item_name: itemName,
      changes: (changes || null) as Json,
    };
    if (!isOnline) {
      offlineQueue.addToQueue({ type: 'insert', table: 'audit_log', data: auditData });
      return;
    }
    try {
      await supabase.from('audit_log').insert([auditData]);
    } catch (error) {
      logger.error('useInventory', 'Audit log error', error);
    }
  };

  // Fetch active items (deleted_at IS NULL)
  useEffect(() => {
    let isMounted = true;

    const fetchItemsSafely = async () => {
      if (!user) {
        if (isMounted) { setItems([]); setLoading(false); }
        return;
      }

      const cachedItems = offlineQueue.getCache<InventoryItem[]>(ITEMS_CACHE_KEY);
      if (cachedItems && cachedItems.length > 0) {
        setItems(cachedItems);
        setLoading(false);
      }

      if (!navigator.onLine) {
        if (!cachedItems) { setItems([]); setLoading(false); }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (isMounted) {
          const typedData = data as InventoryItem[];
          setItems(typedData);
          offlineQueue.setCache(ITEMS_CACHE_KEY, typedData);
        }
      } catch (error) {
        if (isMounted) {
          logger.error('Error fetching items:', error);
          if (!cachedItems) {
            toast({
              title: "Fehler beim Laden",
              description: error instanceof Error ? error.message : 'Items konnten nicht geladen werden.',
              variant: "destructive",
            });
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchItemsSafely();
    return () => { isMounted = false; };
  }, [user, toast]);

  // Initialen Trash-Count laden (nur IDs, kein Full-Fetch)
  useEffect(() => {
    if (!user) return;

    const fetchInitialTrashCount = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('inventory_items')
        .select('*')
        .not('deleted_at', 'is', null)
        .eq('user_id', user.id)
        .gte('deleted_at', thirtyDaysAgo.toISOString())  // nur noch nicht abgelaufene
        .order('deleted_at', { ascending: false });

      if (data) {
        setTrashedItems(data as InventoryItem[]);
      }
    };

    fetchInitialTrashCount();
  }, [user]); // ← nur einmal beim Mount / User-Wechsel

  // Online/offline listeners
  useEffect(() => {
    const handleOnline = async () => {
      await notifyOnline();
      setTimeout(() => refetch(), 500);
    };
    const handleOffline = async () => { await notifyOffline(); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [notifyOffline, notifyOnline]);

  const locations = useMemo(() => {
    return [...new Set(items.map(item => item.location))].sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
      const matchesLocation = locationFilter === 'all' || item.location === locationFilter;
      return matchesSearch && matchesCategory && matchesCondition && matchesLocation;
    });
  }, [items, searchQuery, categoryFilter, conditionFilter, locationFilter]);

  const stats = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    const available = items.filter(i => i.condition === 'verfügbar').reduce((sum, item) => sum + item.quantity, 0);
    const lent = items.filter(i => i.condition === 'verliehen').reduce((sum, item) => sum + item.quantity, 0);
    const inUse = items.filter(i => i.condition === 'in-einsatz').reduce((sum, item) => sum + item.quantity, 0);
    const defect = items.filter(i => i.condition === 'defekt').reduce((sum, item) => sum + item.quantity, 0);
    return { total, available, lent, inUse, defect };
  }, [items]);

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  const addItem = async (item: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const tempId = crypto.randomUUID();
    const newItem: InventoryItem = {
      ...item,
      id: tempId,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedItems = [newItem, ...items];
    setItems(updatedItems);
    offlineQueue.setCache(ITEMS_CACHE_KEY, updatedItems);

    if (!isOnline) {
      offlineQueue.addToQueue({ type: 'insert', table: 'inventory_items', data: { ...item, user_id: user.id, id: tempId } });
      toast({ title: "Offline gespeichert", description: "Item wird synchronisiert, wenn du wieder online bist." });
      await logAudit('create', tempId, item.name);
      return;
    }

    try {
      const { data, error } = await supabase.from('inventory_items').insert({ ...item, user_id: user.id }).select().single();
      if (error) throw error;
      const finalItems = updatedItems.map(i => i.id === tempId ? (data as InventoryItem) : i);
      setItems(finalItems);
      offlineQueue.setCache(ITEMS_CACHE_KEY, finalItems);
      await logAudit('create', data.id, item.name);
      await notifySync(1, 0);
    } catch (error) {
      setItems(items);
      offlineQueue.setCache(ITEMS_CACHE_KEY, items);
      logger.error('Error adding item:', error);
      await notifyError('Item konnte nicht hinzugefügt werden', error instanceof Error ? error.message : 'Unbekannter Fehler');
      toast({ title: "Fehler", description: "Item konnte nicht hinzugefügt werden.", variant: "destructive" });
      throw error;
    }
  };

  const updateItem = async (id: string, updates: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const oldItem = items.find(i => i.id === id);
    if (!oldItem) return;

    const updatedItem = { ...oldItem, ...updates, updated_at: new Date().toISOString() };
    const updatedItems = items.map(item => item.id === id ? updatedItem : item);
    setItems(updatedItems);
    offlineQueue.setCache(ITEMS_CACHE_KEY, updatedItems);

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    Object.keys(updates).forEach(key => {
      const k = key as keyof typeof updates;
      if (oldItem[k] !== updates[k]) changes[key] = { old: oldItem[k], new: updates[k] };
    });

    if (!isOnline) {
      offlineQueue.addToQueue({ type: 'update', table: 'inventory_items', itemId: id, data: updates });
      toast({ title: "Offline gespeichert", description: "Änderungen werden synchronisiert, wenn du wieder online bist." });
      if (Object.keys(changes).length > 0) await logAudit('update', id, oldItem.name, changes);
      return;
    }

    try {
      const { data, error } = await supabase.from('inventory_items').update(updates).eq('id', id).select().single();
      if (error) throw error;
      const finalItems = items.map(item => item.id === id ? (data as InventoryItem) : item);
      setItems(finalItems);
      offlineQueue.setCache(ITEMS_CACHE_KEY, finalItems);
      if (Object.keys(changes).length > 0) await logAudit('update', id, oldItem.name, changes);
      await notifySync(1, 0);
    } catch (error) {
      setItems(items);
      offlineQueue.setCache(ITEMS_CACHE_KEY, items);
      logger.error('Error updating item:', error);
      await notifyError('Item konnte nicht aktualisiert werden', error instanceof Error ? error.message : 'Unbekannter Fehler');
      toast({ title: "Fehler", description: "Item konnte nicht aktualisiert werden.", variant: "destructive" });
      throw error;
    }
  };

  // Soft delete – verschiebt ins Papierkorb
  const deleteItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const deletedAt = new Date().toISOString();
    const trashedItem = { ...item, deleted_at: deletedAt };

    // Optimistisch: aus aktiver Liste entfernen, in Papierkorb legen
    const updatedItems = items.filter(i => i.id !== id);
    setItems(updatedItems);
    setTrashedItems(prev => [trashedItem, ...prev]);
    offlineQueue.setCache(ITEMS_CACHE_KEY, updatedItems);

    if (!isOnline) {
      offlineQueue.addToQueue({ type: 'update', table: 'inventory_items', itemId: id, data: { deleted_at: deletedAt } as any });
      await logAudit('soft_delete', id, item.name);
      return;
    }

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ deleted_at: deletedAt } as any)
        .eq('id', id);
      if (error) throw error;
      await logAudit('soft_delete', id, item.name);
    } catch (error) {
      // Rollback
      setItems(items);
      setTrashedItems(prev => prev.filter(i => i.id !== id));
      offlineQueue.setCache(ITEMS_CACHE_KEY, items);
      logger.error('Error soft-deleting item:', error);
      await notifyError('Item konnte nicht gelöscht werden', error instanceof Error ? error.message : 'Unbekannter Fehler');
      toast({ title: "Fehler", description: "Item konnte nicht gelöscht werden.", variant: "destructive" });
      throw error;
    }
  };

  // ─── Papierkorb-Funktionen ────────────────────────────────────────────────────

  const fetchTrashedItems = async () => {
    if (!user) return;

    // Auto-Cleanup: Items älter als 30 Tage endgültig löschen
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await supabase
      .from('inventory_items')
      .delete()
      .lt('deleted_at', thirtyDaysAgo.toISOString())
      .not('deleted_at', 'is', null);

    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (!error && data) {
      setTrashedItems(data as InventoryItem[]);
    }
  };

  const restoreItem = async (id: string): Promise<InventoryItem | undefined> => {
    const item = trashedItems.find(i => i.id === id);
    if (!item) return undefined;

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({ deleted_at: null } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      const restored = data as InventoryItem;
      setItems(prev => [restored, ...prev]);
      setTrashedItems(prev => prev.filter(i => i.id !== id));
      await logAudit('restore', id, item.name);
      return restored;
    } catch (error) {
      logger.error('Error restoring item:', error);
      toast({ title: "Fehler", description: "Item konnte nicht wiederhergestellt werden.", variant: "destructive" });
      throw error;
    }
  };

  const permanentlyDeleteItem = async (id: string) => {
    const item = trashedItems.find(i => i.id === id);
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
      setTrashedItems(prev => prev.filter(i => i.id !== id));
      await logAudit('permanent_delete', id, item?.name ?? null);
    } catch (error) {
      logger.error('Error permanently deleting item:', error);
      toast({ title: "Fehler", description: "Item konnte nicht endgültig gelöscht werden.", variant: "destructive" });
      throw error;
    }
  };

  const emptyTrash = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .not('deleted_at', 'is', null)
        .eq('user_id', user.id);
      if (error) throw error;
      setTrashedItems([]);
      await logAudit('empty_trash', null, `${trashedItems.length} Items`);
    } catch (error) {
      logger.error('Error emptying trash:', error);
      toast({ title: "Fehler", description: "Papierkorb konnte nicht geleert werden.", variant: "destructive" });
      throw error;
    }
  };

  // ─── Selection ───────────────────────────────────────────────────────────────

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(filteredItems.map(i => i.id)));
  const clearSelection = () => setSelectedIds(new Set());

  // ─── Batch ───────────────────────────────────────────────────────────────────

  const batchUpdateCondition = async (condition: ItemCondition) => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from('inventory_items').update({ condition }).in('id', ids);
      if (error) throw error;
      setItems(items.map(item => selectedIds.has(item.id) ? { ...item, condition } : item));
      const names = items.filter(i => selectedIds.has(i.id)).map(i => i.name).join(', ');
      await logAudit('batch_update', null, `${selectedIds.size} Items`, {
        condition: { old: 'diverse', new: condition }, items: { old: null, new: names }
      });
      await notifySync(selectedIds.size, 0);
      toast({ title: "Batch-Update erfolgreich", description: `${selectedIds.size} Item(s) aktualisiert.` });
      clearSelection();
    } catch (error) {
      logger.error('Batch update error:', error);
      await notifyError('Batch-Update fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannter Fehler');
      toast({ title: "Fehler", description: "Batch-Update fehlgeschlagen.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const batchUpdateLocation = async (location: string) => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from('inventory_items').update({ location }).in('id', ids);
      if (error) throw error;
      setItems(items.map(item => selectedIds.has(item.id) ? { ...item, location } : item));
      const names = items.filter(i => selectedIds.has(i.id)).map(i => i.name).join(', ');
      await logAudit('batch_update', null, `${selectedIds.size} Items`, {
        location: { old: 'diverse', new: location }, items: { old: null, new: names }
      });
      await notifySync(selectedIds.size, 0);
      toast({ title: "Batch-Update erfolgreich", description: `${selectedIds.size} Item(s) verschoben.` });
      clearSelection();
    } catch (error) {
      logger.error('Batch update error:', error);
      await notifyError('Batch-Update fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannter Fehler');
      toast({ title: "Fehler", description: "Batch-Update fehlgeschlagen.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Soft-Batch-Delete – in Papierkorb verschieben
  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    const deletedAt = new Date().toISOString();
    const ids = Array.from(selectedIds);
    const names = items.filter(i => selectedIds.has(i.id)).map(i => i.name).join(', ');
    const itemsToTrash = items.filter(i => selectedIds.has(i.id)).map(i => ({ ...i, deleted_at: deletedAt }));

    // Optimistisch
    setItems(items.filter(item => !selectedIds.has(item.id)));
    setTrashedItems(prev => [...itemsToTrash, ...prev]);

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ deleted_at: deletedAt } as any)
        .in('id', ids);
      if (error) throw error;

      await logAudit('batch_soft_delete', null, `${ids.length} Items`, { items: { old: names, new: null } });
      await notifySync(ids.length, 0);
      hapticFeedback(100);
      toast({ title: "In Papierkorb verschoben", description: `${ids.length} Item(s) in den Papierkorb verschoben.` });
      clearSelection();
    } catch (error) {
      setItems(items);
      setTrashedItems(prev => prev.filter(i => !ids.includes(i.id)));
      logger.error('Batch delete error:', error);
      await notifyError('Batch-Löschen fehlgeschlagen', error instanceof Error ? error.message : 'Unbekannter Fehler');
      toast({ title: "Fehler", description: "Batch-Löschen fehlgeschlagen.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setConditionFilter('all');
    setLocationFilter('all');
  };

  const refetch = async () => {
    if (!isOnline) {
      toast({ title: "Offline", description: "Daten können offline nicht neu geladen werden." });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const typedData = data as InventoryItem[];
      setItems(typedData);
      offlineQueue.setCache(ITEMS_CACHE_KEY, typedData);
      await notifySync(typedData.length, 0);
      toast({ title: "Synchronisierung erfolgreich", description: "Alle Daten sind aktuell." });
    } catch (error) {
      logger.error('Error refetching items:', error);
      await notifyError('Synchronisierungsfehler', error instanceof Error ? error.message : 'Unbekannter Fehler');
      toast({ title: "Fehler beim Neuladen", description: "Items konnten nicht neu geladen werden.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return {
    items: filteredItems,
    allItems: items,
    stats,
    loading,
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    conditionFilter, setConditionFilter,
    locationFilter, setLocationFilter,
    locations,
    clearFilters,
    addItem, updateItem, deleteItem, refetch,
    // Papierkorb
    trashedItems,
    trashedCount: trashedItems.length,
    fetchTrashedItems,
    restoreItem,
    permanentlyDeleteItem,
    emptyTrash,
    // Selection
    selectedIds, toggleSelection, selectAll, clearSelection,
    isProcessing, batchUpdateCondition, batchUpdateLocation, batchDelete,
  };
}