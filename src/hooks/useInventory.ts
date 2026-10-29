import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { InventoryItem, ItemCategory, ItemCondition } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { Database, Json } from '@/integrations/supabase/types';
import { offlineQueue } from '@/lib/offlineQueue';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { hapticFeedback } from '@/lib/utils';
import posthog from "posthog-js";
import { ANALYTICS_CONSENT_KEY } from '@/lib/constants';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';

const t = i18n.t.bind(i18n);

type InventoryRow = Database['public']['Tables']['inventory_items']['Row'];
type InventoryUpdate = Database['public']['Tables']['inventory_items']['Update'];
type InventoryRowWithTags = InventoryRow & {
  item_tags?: { tags: { id: string; name: string } | null }[] | null;
};
type ItemInput = Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
type AuditChanges = Record<string, { old: unknown; new: unknown }>;

/** Legacy (not user-scoped) offline cache key – only read as a migration fallback. */
const ITEMS_CACHE_KEY = 'inventory_items';
const itemsCacheKey = (userId: string) => `${ITEMS_CACHE_KEY}_${userId}`;

/** TanStack Query keys for inventory data. Invalidate `inventoryKeys.all` after writing to inventory_items elsewhere. */
export const inventoryKeys = {
  all: ['inventory'] as const,
  items: (userId: string | undefined) => ['inventory', userId ?? 'anonymous', 'items'] as const,
  trash: (userId: string | undefined) => ['inventory', userId ?? 'anonymous', 'trash'] as const,
};

/** Columns of inventory_items that may be written from the client. Everything else (id, user_id, timestamps, joined data) is stripped. */
const WRITABLE_COLUMNS = [
  'name', 'category', 'quantity', 'condition', 'location', 'notes', 'lent_to', 'lent_until',
  'accessories', 'dmx_start_address', 'dmx_channels', 'dmx_universe', 'unit_price', 'weight_kg',
  'units_per_case', 'dimensions_cm', 'image_url', 'attributes', 'maintenance_interval_days', 'deleted_at',
] as const satisfies readonly (keyof InventoryUpdate)[];

function toDbPayload(input: Partial<ItemInput> | Record<string, unknown>): InventoryUpdate {
  const source = input as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  for (const col of WRITABLE_COLUMNS) {
    if (source[col] !== undefined) payload[col] = source[col];
  }
  if ('attributes' in payload) payload.attributes = (payload.attributes ?? null) as Json;
  return payload as InventoryUpdate;
}

// ── Helper: Analytics mit Consent-Prüfung ─────────────────────────────────────
function captureEvent(eventName: string, properties?: Record<string, unknown>) {
  const consent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
  if (consent === 'true') {
    posthog.capture(eventName, properties);
  }
}

// ── Hilfsfunktion: Raw-DB-Row → InventoryItem mit tags[] ─────────────────────
function mapRow(row: InventoryRowWithTags): InventoryItem {
  const { item_tags, ...rest } = row;
  return {
    ...(rest as unknown as InventoryItem),
    tags: item_tags
      ? item_tags.map(it => it.tags?.name).filter((n): n is string => !!n)
      : [],
  };
}

// ── SELECT-String mit Tag-JOIN ────────────────────────────────────────────────
const SELECT_WITH_TAGS = `*, item_tags(tags(id, name))`;

function readItemsCache(userId: string): InventoryItem[] | undefined {
  const own = offlineQueue.getCache<InventoryItem[]>(itemsCacheKey(userId));
  if (own && own.length > 0) return own;
  // Migration: the old cache key was shared between accounts – only reuse it if it belongs to this user.
  const legacy = offlineQueue.getCache<InventoryItem[]>(ITEMS_CACHE_KEY);
  if (legacy && legacy.length > 0 && legacy.every(i => i.user_id === userId)) return legacy;
  return undefined;
}

async function fetchActiveItems(userId: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select(SELECT_WITH_TAGS)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const items = ((data ?? []) as unknown as InventoryRowWithTags[]).map(mapRow);
  offlineQueue.setCache(itemsCacheKey(userId), items);
  return items;
}

async function fetchTrash(userId: string): Promise<InventoryItem[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data, error } = await supabase
    .from('inventory_items')
    .select(SELECT_WITH_TAGS)
    .not('deleted_at', 'is', null)
    .eq('user_id', userId)
    .gte('deleted_at', thirtyDaysAgo.toISOString())
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as InventoryRowWithTags[]).map(mapRow);
}

// ── Tag-Sync-Hilfsfunktion ────────────────────────────────────────────────
async function syncItemTags(userId: string, itemId: string, tagNames: string[]) {
  // Dedupe + trim: duplicate names in one upsert make Postgres reject the whole statement
  const names = [...new Set(tagNames.map(n => n.trim()).filter(Boolean))];

  const { error: deleteError } = await supabase.from('item_tags').delete().eq('item_id', itemId);
  if (deleteError) throw deleteError;
  if (!names.length) return;

  const { data: upserted, error: upsertError } = await supabase
    .from('tags')
    .upsert(names.map(name => ({ user_id: userId, name })), { onConflict: 'user_id,name' })
    .select('id');
  if (upsertError) throw upsertError;
  if (!upserted?.length) return;

  const { error: linkError } = await supabase
    .from('item_tags')
    .insert(upserted.map(t => ({ item_id: itemId, tag_id: t.id })));
  if (linkError) throw linkError;
}

/** Module-level so that many mounted useInventory() instances only toast a failed load once. */
let lastItemsErrorToastAt = 0;

export function useInventory() {
  const [searchQuery, setSearchQuery] = useState('');
  // Re-filters when the language changes, because the search matches translated category names
  const { t: translate } = useTranslation();
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<ItemCondition | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isManualRefetching, setIsManualRefetching] = useState(false);

  const { user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const { isOnline } = useOnlineStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (userId && localStorage.getItem(ANALYTICS_CONSENT_KEY) === 'true') posthog.identify(userId);
  }, [userId]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const itemsQuery = useQuery({
    queryKey: inventoryKeys.items(userId),
    queryFn: () => fetchActiveItems(userId!),
    enabled: !!userId,
    // Show the offline cache immediately, but treat it as stale so it is refreshed right away.
    initialData: () => (userId ? readItemsCache(userId) : undefined),
    initialDataUpdatedAt: 0,
    // Other screens write inventory_items directly – always revalidate on mount like before.
    staleTime: 0,
  });

  const trashQuery = useQuery({
    queryKey: inventoryKeys.trash(userId),
    queryFn: () => fetchTrash(userId!),
    enabled: !!userId,
    staleTime: 0,
  });

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const trashedItems = useMemo(() => trashQuery.data ?? [], [trashQuery.data]);

  useEffect(() => {
    const { error, errorUpdatedAt, data } = itemsQuery;
    if (!error || errorUpdatedAt === lastItemsErrorToastAt) return;
    lastItemsErrorToastAt = errorUpdatedAt;
    logger.error('useInventory', 'Failed to load items', error);
    if (!data) {
      toast({
        title: t('inventory.toast.load_failed_title', { defaultValue: 'Fehler beim Laden' }),
        description: error instanceof Error ? error.message : t('inventory.toast.load_failed', { defaultValue: 'Items konnten nicht geladen werden.' }),
        variant: "destructive",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to new errors
  }, [itemsQuery.error, itemsQuery.errorUpdatedAt]);

  useEffect(() => {
    if (trashQuery.error) logger.error('useInventory', 'Failed to load trash', trashQuery.error);
  }, [trashQuery.error]);

  // ── Cache helpers (functional updates → no stale closures) ──────────────────
  const getItems = useCallback(
    () => queryClient.getQueryData<InventoryItem[]>(inventoryKeys.items(userId)) ?? [],
    [queryClient, userId],
  );

  const setItems = useCallback((updater: (prev: InventoryItem[]) => InventoryItem[]) => {
    if (!userId) return;
    const next = queryClient.setQueryData<InventoryItem[]>(
      inventoryKeys.items(userId),
      prev => updater(prev ?? []),
    );
    if (next) offlineQueue.setCache(itemsCacheKey(userId), next);
  }, [queryClient, userId]);

  const setTrash = useCallback((updater: (prev: InventoryItem[]) => InventoryItem[]) => {
    if (!userId) return;
    queryClient.setQueryData<InventoryItem[]>(inventoryKeys.trash(userId), prev => updater(prev ?? []));
  }, [queryClient, userId]);

  /** Stop in-flight refetches so they can't overwrite an optimistic update. */
  const cancelInventoryQueries = useCallback(
    () => queryClient.cancelQueries({ queryKey: ['inventory', userId ?? 'anonymous'] }),
    [queryClient, userId],
  );

  const logAudit = async (
    action: string,
    itemId: string | null,
    itemName: string | null,
    changes?: AuditChanges
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
    const { error } = await supabase.from('audit_log').insert([auditData]);
    if (error) logger.error('useInventory', 'Audit log error', error);
  };

  const syncTagsSafely = async (itemId: string, tagNames: string[]) => {
    if (!user) return;
    try {
      await syncItemTags(user.id, itemId, tagNames);
    } catch (error) {
      logger.error('useInventory', 'Tag sync failed', error, { itemId });
      toast({
        title: t('inventory.toast.error', { defaultValue: 'Fehler' }),
        description: t('inventory.tags_save_failed', { defaultValue: 'Tags konnten nicht gespeichert werden.' }),
        variant: "destructive",
      });
    }
  };

  const availableTags = useMemo(() => {
    return [...new Set(items.flatMap(i => i.tags ?? []))].sort();
  }, [items]);

  const locations = useMemo(() => {
    return [...new Set(items.map(item => item.location))].filter(Boolean).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    // Category label in the current language ("Licht" / "Lighting"), cached per category id
    const categoryLabels = new Map<string, string>();
    const categoryLabel = (id: string) => {
      let label = categoryLabels.get(id);
      if (label === undefined) {
        label = `${id} ${translate(`categories.${id}`, { defaultValue: id })}`.toLowerCase();
        categoryLabels.set(id, label);
      }
      return label;
    };
    return items.filter((item) => {
      const tags = item.tags ?? [];
      const matchesSearch = q === '' ||
        item.name.toLowerCase().includes(q) ||
        (item.location ?? '').toLowerCase().includes(q) ||
        tags.some(t => t.toLowerCase().includes(q)) ||
        (!!item.category && categoryLabel(item.category).includes(q));
      const matchesCategory  = categoryFilter  === 'all' || item.category  === categoryFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
      const matchesLocation  = locationFilter  === 'all' || item.location  === locationFilter;
      const matchesTag       = tagFilter       === 'all' || tags.includes(tagFilter);
      return matchesSearch && matchesCategory && matchesCondition && matchesLocation && matchesTag;
    });
  }, [items, searchQuery, categoryFilter, conditionFilter, locationFilter, tagFilter, translate]);

  const stats = useMemo(() => {
    const total     = items.reduce((sum, item) => sum + item.quantity, 0);
    const available = items.filter(i => i.condition === 'verfügbar').reduce((s, i) => s + i.quantity, 0);
    const lent      = items.filter(i => i.condition === 'verliehen').reduce((s, i) => s + i.quantity, 0);
    const inUse     = items.filter(i => i.condition === 'in-einsatz').reduce((s, i) => s + i.quantity, 0);
    const defect    = items.filter(i => i.condition === 'defekt').reduce((s, i) => s + i.quantity, 0);
    return { total, available, lent, inUse, defect };
  }, [items]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /** Resolves with the saved item (the optimistic offline copy when offline). */
  const addItem = async (item: ItemInput): Promise<InventoryItem | undefined> => {
    if (!user) return undefined;
    const { tags } = item;
    const dbItem = toDbPayload(item);
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const newItem: InventoryItem = {
      ...item,
      id: tempId,
      user_id: user.id,
      tags: tags ?? [],
      created_at: now,
      updated_at: now,
    };

    await cancelInventoryQueries();
    setItems(prev => [newItem, ...prev]);

    if (!isOnline) {
      offlineQueue.addToQueue({ type: 'insert', table: 'inventory_items', data: { ...dbItem, user_id: user.id, id: tempId } });
      toast({ title: t('inventory.toast.offline_saved', { defaultValue: 'Offline gespeichert' }), description: t('inventory.toast.offline_item_queued', { defaultValue: 'Item wird synchronisiert, wenn du wieder online bist.' }) });
      await logAudit('create', tempId, item.name);
      return newItem;
    }

    let created: InventoryRow;
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          ...dbItem,
          name: item.name,
          category: item.category,
          location: item.location,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      created = data;
    } catch (error) {
      setItems(prev => prev.filter(i => i.id !== tempId));
      logger.error('useInventory', 'Error adding item', error);
      toast({ title: t('inventory.toast.error', { defaultValue: 'Fehler' }), description: t('inventory.toast.add_failed', { defaultValue: 'Item konnte nicht hinzugefügt werden.' }), variant: "destructive" });
      throw error;
    }

    // The item exists from here on – tag/refresh failures must not roll it back.
    await syncTagsSafely(created.id, tags ?? []);

    const { data: fresh, error: freshError } = await supabase
      .from('inventory_items')
      .select(SELECT_WITH_TAGS)
      .eq('id', created.id)
      .single();
    if (freshError) logger.warn('useInventory', 'Could not reload created item', freshError);

    const finalItem = fresh
      ? mapRow(fresh as unknown as InventoryRowWithTags)
      : { ...(created as unknown as InventoryItem), tags: tags ?? [] };
    setItems(prev => prev.map(i => i.id === tempId ? finalItem : i));
    await logAudit('create', created.id, item.name);
    captureEvent("item_created", {
      category: item.category,
      has_image: !!item.image_url,
      quantity: item.quantity,
      has_tags: (item.tags?.length ?? 0) > 0,
      tags_count: item.tags?.length ?? 0,
      created_offline: false,
    });
    captureEvent("inventory_size_changed", { total_items: getItems().length });
    return finalItem;
  };

  /** Accepts full or partial updates; `tags` are only synced when provided. */
  const updateItem = async (id: string, updates: Partial<ItemInput>) => {
    const oldItem = getItems().find(i => i.id === id);
    if (!oldItem) return;

    const { tags } = updates;
    const dbUpdates = toDbPayload(updates);
    const updatedItem: InventoryItem = { ...oldItem, ...updates, id, updated_at: new Date().toISOString() };

    await cancelInventoryQueries();
    setItems(prev => prev.map(item => item.id === id ? updatedItem : item));

    const changes: AuditChanges = {};
    (Object.keys(dbUpdates) as (keyof InventoryUpdate)[]).forEach(key => {
      const oldValue = (oldItem as unknown as Record<string, unknown>)[key];
      const newValue = dbUpdates[key];
      if (oldValue !== newValue) changes[key] = { old: oldValue, new: newValue };
    });

    if (!isOnline) {
      offlineQueue.addToQueue({ type: 'update', table: 'inventory_items', itemId: id, data: dbUpdates as Record<string, unknown> });
      toast({ title: t('inventory.toast.offline_saved', { defaultValue: 'Offline gespeichert' }), description: t('inventory.toast.offline_changes_queued', { defaultValue: 'Änderungen werden synchronisiert, wenn du wieder online bist.' }) });
      if (Object.keys(changes).length > 0) await logAudit('update', id, oldItem.name, changes);
      return;
    }

    let saved: InventoryRow;
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      saved = data;
    } catch (error) {
      setItems(prev => prev.map(item => item.id === id ? oldItem : item));
      logger.error('useInventory', 'Error updating item', error);
      toast({ title: t('inventory.toast.error', { defaultValue: 'Fehler' }), description: t('inventory.toast.update_failed', { defaultValue: 'Item konnte nicht aktualisiert werden.' }), variant: "destructive" });
      throw error;
    }

    // Only touch tags when the caller actually passed them (avoids wiping tags on partial updates)
    if (tags !== undefined) await syncTagsSafely(id, tags);

    const finalItem: InventoryItem = { ...(saved as unknown as InventoryItem), tags: tags ?? oldItem.tags ?? [] };
    setItems(prev => prev.map(item => item.id === id ? finalItem : item));
    if (Object.keys(changes).length > 0) await logAudit('update', id, oldItem.name, changes);
    captureEvent("item_updated", {
      fields_changed: Object.keys(changes),
      fields_count: Object.keys(changes).length,
      updated_offline: false,
    });
  };

  const deleteItem = async (id: string) => {
    const current = getItems();
    const index = current.findIndex(i => i.id === id);
    const item = current[index];
    if (!item) return;
    const deletedAt = new Date().toISOString();
    const trashedItem = { ...item, deleted_at: deletedAt };

    await cancelInventoryQueries();
    setItems(prev => prev.filter(i => i.id !== id));
    setTrash(prev => [trashedItem, ...prev.filter(i => i.id !== id)]);

    const trackDeletion = () => {
      captureEvent("inventory_size_changed", { total_items: getItems().length });
      captureEvent("item_deleted", {
        had_tags: (item.tags?.length ?? 0) > 0,
        category: item.category,
      });
    };

    if (!isOnline) {
      offlineQueue.addToQueue({ type: 'update', table: 'inventory_items', itemId: id, data: { deleted_at: deletedAt } });
      trackDeletion();
      await logAudit('soft_delete', id, item.name);
      return;
    }
    try {
      const { error } = await supabase.from('inventory_items').update({ deleted_at: deletedAt }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      setItems(prev => {
        if (prev.some(i => i.id === id)) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, item);
        return next;
      });
      setTrash(prev => prev.filter(i => i.id !== id));
      logger.error('useInventory', 'Error soft-deleting item', error);
      toast({ title: t('inventory.toast.error', { defaultValue: 'Fehler' }), description: t('inventory.toast.delete_failed', { defaultValue: 'Item konnte nicht gelöscht werden.' }), variant: "destructive" });
      throw error;
    }
    trackDeletion();
    await logAudit('soft_delete', id, item.name);
  };

  const fetchTrashedItems = async () => {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    // Purge items older than 30 days (scoped to the current user)
    const { error: purgeError } = await supabase
      .from('inventory_items')
      .delete()
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo.toISOString());
    if (purgeError) logger.warn('useInventory', 'Trash purge failed', purgeError);

    try {
      await queryClient.fetchQuery({
        queryKey: inventoryKeys.trash(user.id),
        queryFn: () => fetchTrash(user.id),
        staleTime: 0,
      });
    } catch (error) {
      logger.error('useInventory', 'Error fetching trash', error);
      throw error;
    }
  };

  const restoreItem = async (id: string): Promise<InventoryItem | undefined> => {
    const item = trashedItems.find(i => i.id === id)
      ?? queryClient.getQueryData<InventoryItem[]>(inventoryKeys.trash(userId))?.find(i => i.id === id);
    if (!item) return undefined;
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({ deleted_at: null })
        .eq('id', id)
        .select(SELECT_WITH_TAGS)
        .single();
      if (error) throw error;
      const restored = mapRow(data as unknown as InventoryRowWithTags);
      await cancelInventoryQueries();
      setItems(prev => [restored, ...prev.filter(i => i.id !== id)]);
      setTrash(prev => prev.filter(i => i.id !== id));
      await logAudit('restore', id, item.name);
      return restored;
    } catch (error) {
      logger.error('useInventory', 'Error restoring item', error);
      toast({ title: t('inventory.toast.error', { defaultValue: 'Fehler' }), description: t('inventory.toast.restore_failed', { defaultValue: 'Item konnte nicht wiederhergestellt werden.' }), variant: "destructive" });
      throw error;
    }
  };

  const permanentlyDeleteItem = async (id: string) => {
    const item = trashedItems.find(i => i.id === id);
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
      setTrash(prev => prev.filter(i => i.id !== id));
      await logAudit('permanent_delete', id, item?.name ?? null);
    } catch (error) {
      logger.error('useInventory', 'Error permanently deleting item', error);
      toast({ title: t('inventory.toast.error', { defaultValue: 'Fehler' }), description: t('inventory.toast.permanent_delete_failed', { defaultValue: 'Item konnte nicht endgültig gelöscht werden.' }), variant: "destructive" });
      throw error;
    }
  };

  const emptyTrash = async () => {
    if (!user) return;
    const count = trashedItems.length;
    try {
      const { error } = await supabase.from('inventory_items').delete().not('deleted_at', 'is', null).eq('user_id', user.id);
      if (error) throw error;
      setTrash(() => []);
      await logAudit('empty_trash', null, `${count} Items`);
    } catch (error) {
      logger.error('useInventory', 'Error emptying trash', error);
      toast({ title: t('inventory.toast.error', { defaultValue: 'Fehler' }), description: t('inventory.toast.empty_trash_failed', { defaultValue: 'Papierkorb konnte nicht geleert werden.' }), variant: "destructive" });
      throw error;
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll      = () => setSelectedIds(new Set(filteredItems.map(i => i.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const batchUpdate = async (
    patch: Pick<InventoryUpdate, 'condition' | 'location'>,
    auditField: 'condition' | 'location',
    successDescription: (count: number) => string,
  ) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const idSet = new Set(ids);
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('inventory_items').update(patch).in('id', ids);
      if (error) throw error;
      await cancelInventoryQueries();
      setItems(prev => prev.map(item => idSet.has(item.id) ? { ...item, ...patch } as InventoryItem : item));
      const names = getItems().filter(i => idSet.has(i.id)).map(i => i.name).join(', ');
      await logAudit('batch_update', null, `${ids.length} Items`, {
        [auditField]: { old: 'diverse', new: patch[auditField] },
        items: { old: null, new: names },
      });
      toast({ title: t('inventory.toast.batch_update_success', { defaultValue: 'Batch-Update erfolgreich' }), description: successDescription(ids.length) });
      clearSelection();
    } catch (error) {
      logger.error('useInventory', 'Batch update error', error);
      toast({ title: t('inventory.toast.error', { defaultValue: 'Fehler' }), description: t('inventory.toast.batch_update_failed', { defaultValue: 'Batch-Update fehlgeschlagen.' }), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const batchUpdateCondition = (condition: ItemCondition) =>
    batchUpdate({ condition }, 'condition', count => t('inventory.toast.batch_updated_count', { defaultValue: '{{count}} Item(s) aktualisiert.', count }));

  const batchUpdateLocation = (location: string) =>
    batchUpdate({ location }, 'location', count => t('inventory.toast.batch_moved_count', { defaultValue: '{{count}} Item(s) verschoben.', count }));

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    const deletedAt = new Date().toISOString();
    const ids = Array.from(selectedIds);
    const idSet = new Set(ids);
    const snapshot = getItems();
    const removed = snapshot.filter(i => idSet.has(i.id));
    const names = removed.map(i => i.name).join(', ');
    const itemsToTrash = removed.map(i => ({ ...i, deleted_at: deletedAt }));

    await cancelInventoryQueries();
    setItems(prev => prev.filter(item => !idSet.has(item.id)));
    setTrash(prev => [...itemsToTrash, ...prev.filter(i => !idSet.has(i.id))]);
    try {
      const { error } = await supabase.from('inventory_items').update({ deleted_at: deletedAt }).in('id', ids);
      if (error) throw error;
      captureEvent("inventory_size_changed", { total_items: getItems().length });
      await logAudit('batch_soft_delete', null, `${ids.length} Items`, { items: { old: names, new: null } });
      hapticFeedback(100);
      toast({ title: t('inventory.toast.moved_to_trash', { defaultValue: 'In Papierkorb verschoben' }), description: t('inventory.toast.moved_to_trash_count', { defaultValue: '{{count}} Item(s) in den Papierkorb verschoben.', count: ids.length }) });
      clearSelection();
    } catch (error) {
      // Restore the removed items at their original positions
      setItems(prev => {
        const present = new Set(prev.map(i => i.id));
        const missing = removed.filter(i => !present.has(i.id));
        if (!missing.length) return prev;
        const order = new Map(snapshot.map((i, idx) => [i.id, idx]));
        return [...prev, ...missing].sort((a, b) => (order.get(a.id) ?? -1) - (order.get(b.id) ?? -1));
      });
      setTrash(prev => prev.filter(i => !idSet.has(i.id)));
      logger.error('useInventory', 'Batch delete error', error);
      toast({ title: t('inventory.toast.error', { defaultValue: 'Fehler' }), description: t('inventory.toast.batch_delete_failed', { defaultValue: 'Batch-Löschen fehlgeschlagen.' }), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
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
      toast({ title: t('inventory.toast.offline', { defaultValue: 'Offline' }), description: t('inventory.toast.offline_no_refresh', { defaultValue: 'Daten können offline nicht neu geladen werden.' }) });
      return;
    }
    if (!userId) return;
    setIsManualRefetching(true);
    try {
      const result = await itemsQuery.refetch();
      if (result.error) throw result.error;
    } catch (error) {
      logger.error('useInventory', 'Error refetching items', error);
      toast({ title: t('inventory.toast.reload_failed_title', { defaultValue: 'Fehler beim Neuladen' }), description: t('inventory.toast.reload_failed', { defaultValue: 'Items konnten nicht neu geladen werden.' }), variant: "destructive" });
    } finally {
      setIsManualRefetching(false);
    }
  };

  return {
    items: filteredItems,
    allItems: items,
    stats,
    loading: itemsQuery.isLoading || isManualRefetching,
    /** Load error of the item list (null when the last fetch succeeded). */
    error: (itemsQuery.error as Error | null) ?? null,
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
