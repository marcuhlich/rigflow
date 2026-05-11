import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { InventoryItem, ItemCategory, ItemCondition } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Json } from '@/integrations/supabase/types';
import { offlineQueue } from '@/lib/offlineQueue';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { hapticFeedback } from '@/lib/utils';
import posthog from "posthog-js";
import { ANALYTICS_CONSENT_KEY } from '@/lib/constants';

const ITEMS_CACHE_KEY = 'inventory_items';

// ── Helper: Analytics mit Consent-Prüfung ─────────────────────────────────────
function captureEvent(eventName: string, properties?: Record<string, any>) {
  const consent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
  if (consent === 'true') {
    posthog.capture(eventName, properties);
  }
}

// ── Hilfsfunktion: Raw-DB-Row → InventoryItem mit tags[] ─────────────────────
function mapRow(row: any): InventoryItem {
  return {
    ...row,
    tags: row.item_tags
      ? (row.item_tags as { tags: { name: string } | null }[])
          .map(it => it.tags?.name)
          .filter((n): n is string => !!n)
      : [],
  };
}

// ── SELECT-String mit Tag-JOIN ────────────────────────────────────────────────
const SELECT_WITH_TAGS = `*, item_tags(tags(id, name))`;

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

  useEffect(() => {
  if (user) {
    posthog.identify(user.id);
  }
}, [user]);

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

  // ── Tag-Sync-Hilfsfunktion ────────────────────────────────────────────────
  const syncItemTags = async (itemId: string, tagNames: string[]) => {
    if (!user) return;
    await supabase.from('item_tags').delete().eq('item_id', itemId);
    if (!tagNames.length) return;

    const tagRows = tagNames.map(name => ({ user_id: user.id, name: name.trim() }));
    const { data: upserted, error } = await supabase
      .from('tags')
      .upsert(tagRows, { onConflict: 'user_id,name' })
      .select('id');
    if (error || !upserted?.length) return;

    await supabase
      .from('item_tags')
      .insert(upserted.map(t => ({ item_id: itemId, tag_id: t.id })));
  };

  // ── Fetch aktive Items ────────────────────────────────────────────────────
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
          .select(SELECT_WITH_TAGS)
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (isMounted) {
          const typedData = (data as any[]).map(mapRow);
          setItems(typedData);
          offlineQueue.setCache(ITEMS_CACHE_KEY, typedData);
        }
      } catch (error) {
        if (isMounted) {
          const cachedItems = offlineQueue.getCache<InventoryItem[]>(ITEMS_CACHE_KEY);
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

  const [tagFilter, setTagFilter] = useState<string>('all');

  const availableTags = useMemo(() => {
    return [...new Set(items.flatMap(i => i.tags))].sort();
  }, [items]);

  // Trash-Load
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
        .gte('deleted_at', thirtyDaysAgo.toISOString())
        .order('deleted_at', { ascending: false });
      if (data) setTrashedItems((data as any[]).map(r => ({ ...r, tags: [] })));
    };
    fetchInitialTrashCount();
  }, [user]);

  // Online/Offline
  useEffect(() => {
    const handleOnline  = () => { setTimeout(() => refetch(), 500); };
    const handleOffline = () => {};
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const locations = useMemo(() => {
    return [...new Set(items.map(item => item.location))].filter(Boolean).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = q === '' ||
        item.name.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q));
      const matchesCategory  = categoryFilter  === 'all' || item.category  === categoryFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
      const matchesLocation  = locationFilter  === 'all' || item.location  === locationFilter;
      const matchesTag       = tagFilter       === 'all' || item.tags.includes(tagFilter);
      return matchesSearch && matchesCategory && matchesCondition && matchesLocation && matchesTag;
    });
  }, [items, searchQuery, categoryFilter, conditionFilter, locationFilter, tagFilter]);

  const stats = useMemo(() => {
    const total     = items.reduce((sum, item) => sum + item.quantity, 0);
    const available = items.filter(i => i.condition === 'verfügbar').reduce((s, i) => s + i.quantity, 0);
    const lent      = items.filter(i => i.condition === 'verliehen').reduce((s, i) => s + i.quantity, 0);
    const inUse     = items.filter(i => i.condition === 'in-einsatz').reduce((s, i) => s + i.quantity, 0);
    const defect    = items.filter(i => i.condition === 'defekt').reduce((s, i) => s + i.quantity, 0);
    return { total, available, lent, inUse, defect };
  }, [items]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const addItem = async (item: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    const { tags, ...dbItem } = item;
    const tempId = crypto.randomUUID();
    const newItem: InventoryItem = {
      ...item,
      id: tempId,
      user_id: user.id,
      tags: tags ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedItems = [newItem, ...items];
    setItems(updatedItems);
    offlineQueue.setCache(ITEMS_CACHE_KEY, updatedItems);

    if (!isOnline) {
      offlineQueue.addToQueue({ type: 'insert', table: 'inventory_items', data: { ...dbItem, user_id: user.id, id: tempId } });
      toast({ title: "Offline gespeichert", description: "Item wird synchronisiert, wenn du wieder online bist." });
      await logAudit('create', tempId, item.name);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          ...dbItem,
          user_id: user.id,
          attributes: dbItem.attributes as Json ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      await syncItemTags(data.id, tags ?? []);

      const { data: fresh } = await supabase
        .from('inventory_items')
        .select(SELECT_WITH_TAGS)
        .eq('id', data.id)
        .single();

      const finalItem = fresh ? mapRow(fresh) : { ...(data as unknown as InventoryItem), tags: tags ?? [] };
      const finalItems = updatedItems.map(i => i.id === tempId ? finalItem : i);
      setItems(finalItems);
      offlineQueue.setCache(ITEMS_CACHE_KEY, finalItems);
      await logAudit('create', data.id, item.name);
      captureEvent("item_created", {
        category: item.category,
        has_image: !!item.image_url,
        quantity: item.quantity,
        has_tags: (item.tags?.length ?? 0) > 0,
        tags_count: item.tags?.length ?? 0,
        created_offline: !isOnline,
      });
    } catch (error) {
      setItems(items);
      captureEvent("inventory_size_changed", {
        total_items: items.length,
      });
      offlineQueue.setCache(ITEMS_CACHE_KEY, items);
      logger.error('Error adding item:', error);
      toast({ title: "Fehler", description: "Item konnte nicht hinzugefügt werden.", variant: "destructive" });
      throw error;
    }
  };

  const updateItem = async (id: string, updates: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const oldItem = items.find(i => i.id === id);
    if (!oldItem) return;

    const { tags, ...dbUpdates } = updates;
    const updatedItem = { ...oldItem, ...updates, updated_at: new Date().toISOString() };
    const updatedItems = items.map(item => item.id === id ? updatedItem : item);
    setItems(updatedItems);
    offlineQueue.setCache(ITEMS_CACHE_KEY, updatedItems);

    const changes: Record<string, { old: unknown; new: unknown }> = {};
    Object.keys(dbUpdates).forEach(key => {
      const k = key as keyof typeof dbUpdates;
      if (oldItem[k] !== (dbUpdates as any)[k]) changes[key] = { old: oldItem[k], new: (dbUpdates as any)[k] };
    });

    if (!isOnline) {
      offlineQueue.addToQueue({ type: 'update', table: 'inventory_items', itemId: id, data: dbUpdates });
      toast({ title: "Offline gespeichert", description: "Änderungen werden synchronisiert, wenn du wieder online bist." });
      if (Object.keys(changes).length > 0) await logAudit('update', id, oldItem.name, changes);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          ...dbUpdates,
          attributes: dbUpdates.attributes as Json ?? null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await syncItemTags(id, tags ?? []);

      const finalItem: InventoryItem = { ...(data as unknown as InventoryItem), tags: tags ?? [] };
      const finalItems = items.map(item => item.id === id ? finalItem : item);
      setItems(finalItems);
      offlineQueue.setCache(ITEMS_CACHE_KEY, finalItems);
      if (Object.keys(changes).length > 0) await logAudit('update', id, oldItem.name, changes);
      captureEvent("item_updated", {
        fields_changed: Object.keys(changes),
        fields_count: Object.keys(changes).length,
        updated_offline: !isOnline,
      });
    } catch (error) {
      setItems(items);
      offlineQueue.setCache(ITEMS_CACHE_KEY, items);
      logger.error('Error updating item:', error);
      toast({ title: "Fehler", description: "Item konnte nicht aktualisiert werden.", variant: "destructive" });
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const deletedAt = new Date().toISOString();
    const trashedItem = { ...item, deleted_at: deletedAt };
    const updatedItems = items.filter(i => i.id !== id);
    setItems(updatedItems);
    captureEvent("inventory_size_changed", {
      total_items: updatedItems.length,
    });
    captureEvent("item_deleted", {
        had_tags: item.tags.length > 0,
        category: item.category,
      });
    setTrashedItems(prev => [trashedItem, ...prev]);
    offlineQueue.setCache(ITEMS_CACHE_KEY, updatedItems);
    if (!isOnline) {
      offlineQueue.addToQueue({ type: 'update', table: 'inventory_items', itemId: id, data: { deleted_at: deletedAt } as any });
      await logAudit('soft_delete', id, item.name);
      return;
    }
    try {
      const { error } = await supabase.from('inventory_items').update({ deleted_at: deletedAt } as any).eq('id', id);
      if (error) throw error;
      await logAudit('soft_delete', id, item.name);
    } catch (error) {
      setItems(items);
      setTrashedItems(prev => prev.filter(i => i.id !== id));
      offlineQueue.setCache(ITEMS_CACHE_KEY, items);
      logger.error('Error soft-deleting item:', error);
      toast({ title: "Fehler", description: "Item konnte nicht gelöscht werden.", variant: "destructive" });
      throw error;
    }
  };

  const fetchTrashedItems = async () => {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await supabase.from('inventory_items').delete().lt('deleted_at', thirtyDaysAgo.toISOString()).not('deleted_at', 'is', null);
    const { data, error } = await supabase.from('inventory_items').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
    if (!error && data) setTrashedItems((data as any[]).map(r => ({ ...r, tags: [] })));
  };

  const restoreItem = async (id: string): Promise<InventoryItem | undefined> => {
    const item = trashedItems.find(i => i.id === id);
    if (!item) return undefined;
    try {
      const { data, error } = await supabase.from('inventory_items').update({ deleted_at: null } as any).eq('id', id).select().single();
      if (error) throw error;
      const restored = { ...(data as unknown as InventoryItem), tags: [] };
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
      const { error } = await supabase.from('inventory_items').delete().not('deleted_at', 'is', null).eq('user_id', user.id);
      if (error) throw error;
      setTrashedItems([]);
      await logAudit('empty_trash', null, `${trashedItems.length} Items`);
    } catch (error) {
      logger.error('Error emptying trash:', error);
      toast({ title: "Fehler", description: "Papierkorb konnte nicht geleert werden.", variant: "destructive" });
      throw error;
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const selectAll      = () => setSelectedIds(new Set(filteredItems.map(i => i.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const batchUpdateCondition = async (condition: ItemCondition) => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from('inventory_items').update({ condition }).in('id', ids);
      if (error) throw error;
      setItems(items.map(item => selectedIds.has(item.id) ? { ...item, condition } : item));
      const names = items.filter(i => selectedIds.has(i.id)).map(i => i.name).join(', ');
      await logAudit('batch_update', null, `${selectedIds.size} Items`, { condition: { old: 'diverse', new: condition }, items: { old: null, new: names } });
      toast({ title: "Batch-Update erfolgreich", description: `${selectedIds.size} Item(s) aktualisiert.` });
      clearSelection();
    } catch (error) {
      logger.error('Batch update error:', error);
      toast({ title: "Fehler", description: "Batch-Update fehlgeschlagen.", variant: "destructive" });
    } finally { setIsProcessing(false); }
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
      await logAudit('batch_update', null, `${selectedIds.size} Items`, { location: { old: 'diverse', new: location }, items: { old: null, new: names } });
      toast({ title: "Batch-Update erfolgreich", description: `${selectedIds.size} Item(s) verschoben.` });
      clearSelection();
    } catch (error) {
      logger.error('Batch update error:', error);
      toast({ title: "Fehler", description: "Batch-Update fehlgeschlagen.", variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    const deletedAt = new Date().toISOString();
    const ids = Array.from(selectedIds);
    const names = items.filter(i => selectedIds.has(i.id)).map(i => i.name).join(', ');
    const itemsToTrash = items.filter(i => selectedIds.has(i.id)).map(i => ({ ...i, deleted_at: deletedAt }));
    setItems(items.filter(item => !selectedIds.has(item.id)));
    captureEvent("inventory_size_changed", {
      total_items: items.length - selectedIds.size,
    });
    setTrashedItems(prev => [...itemsToTrash, ...prev]);
    try {
      const { error } = await supabase.from('inventory_items').update({ deleted_at: deletedAt } as any).in('id', ids);
      if (error) throw error;
      await logAudit('batch_soft_delete', null, `${ids.length} Items`, { items: { old: names, new: null } });
      hapticFeedback(100);
      toast({ title: "In Papierkorb verschoben", description: `${ids.length} Item(s) in den Papierkorb verschoben.` });
      clearSelection();
    } catch (error) {
      setItems(items);
      setTrashedItems(prev => prev.filter(i => !ids.includes(i.id)));
      logger.error('Batch delete error:', error);
      toast({ title: "Fehler", description: "Batch-Löschen fehlgeschlagen.", variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setConditionFilter('all');
    setLocationFilter('all');
    setTagFilter('all');
  };

  const refetch = async () => {
    if (!isOnline) {
      toast({ title: "Offline", description: "Daten können offline nicht neu geladen werden." });
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(SELECT_WITH_TAGS)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const typedData = (data as any[]).map(mapRow);
      setItems(typedData);
      offlineQueue.setCache(ITEMS_CACHE_KEY, typedData);
    } catch (error) {
      logger.error('Error refetching items:', error);
      toast({ title: "Fehler beim Neuladen", description: "Items konnten nicht neu geladen werden.", variant: "destructive" });
    } finally { setLoading(false); }
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
    trashedItems,
    trashedCount: trashedItems.length,
    fetchTrashedItems, restoreItem, permanentlyDeleteItem, emptyTrash,
    selectedIds, toggleSelection, selectAll, clearSelection,
    isProcessing, batchUpdateCondition, batchUpdateLocation, batchDelete,
    tagFilter, setTagFilter, availableTags,
  };
}