import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import {
  check, toProjectItem, restoreInventoryItem, syncPackageInstanceItems,
  restoreAllItemsOfProject, markProjectItemsInUse,
} from '@/components/project-detail/projectItemsApi';
import { useToast } from '@/hooks/use-toast';
import { Project, ProjectItem, ProjectTodo, Package, ProjectStatus } from '@/types/project';
import { InventoryItem } from '@/types/inventory';

export type ItemReturnCondition = ProjectItem['condition'];

export interface EnrichedProjectItem extends ProjectItem {
  original_location?: string | null;
  item_name?: string;
  item_category?: string;
  item_location?: string;
}

export interface ProjectPackageGroup {
  instanceId: string; // project_packages.id
  package_id: string;
  package: Package;
  items: EnrichedProjectItem[];
}

type ProjectPackageRow = Tables<'project_packages'>;
type ProjectUpdate     = Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>>;

const IN_USE_STATUSES: ProjectStatus[] = ['transit', 'live', 'returning'];

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectDetail(projectId: string | undefined) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [project,            setProject]            = useState<Project | null>(null);
  const [allItems,           setAllItems]           = useState<EnrichedProjectItem[]>([]);
  const [instances,          setInstances]          = useState<ProjectPackageRow[]>([]);
  const [packages,           setPackages]           = useState<Package[]>([]);
  const [todos,              setTodos]              = useState<ProjectTodo[]>([]);
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<Error | null>(null);

  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fail = useCallback((err: unknown) => {
    if (!mountedRef.current) return;
    toast({
      title: t('common.error'),
      description: err instanceof Error ? err.message : t('common.unknown_error'),
      variant: 'destructive',
    });
  }, [toast, t]);

  const fetchAll = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    const request = ++requestRef.current;
    const isCurrent = () => mountedRef.current && request === requestRef.current;

    try {
      const [projRes, ppRes, todosRes, invRes, pkgsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
        supabase.from('project_packages').select('*').eq('project_id', projectId),
        supabase.from('project_todos').select('*').eq('project_id', projectId).order('position'),
        supabase.from('inventory_items').select('*').is('deleted_at', null),
        supabase.from('packages').select('*'),
      ]);
      check(projRes.error);
      check(ppRes.error);
      check(todosRes.error);
      check(invRes.error);
      check(pkgsRes.error);

      const ppRows = ppRes.data ?? [];
      // Best-effort: reflect package edits in this project. A failed sync must
      // not block viewing the project, so the result is intentionally ignored.
      // Archived projects are a historical record and are never re-synced.
      if (projRes.data && projRes.data.status !== 'archived') {
        await Promise.allSettled(ppRows.map(pp => syncPackageInstanceItems(projectId, pp.id, pp.package_id)));
      }

      const piRes = await supabase.from('project_items').select('*').eq('project_id', projectId);
      check(piRes.error);
      if (!isCurrent()) return;

      const inv = (invRes.data ?? []) as unknown as InventoryItem[];
      const invById = new Map(inv.map(i => [i.id, i]));
      const items = (piRes.data ?? []).map(row => {
        const found = invById.get(row.inventory_item_id);
        return {
          ...toProjectItem(row),
          item_name:     found?.name,
          item_category: found?.category,
          item_location: found?.location,
        };
      });

      setProject(projRes.data as unknown as Project | null);
      setAvailableInventory(inv);
      setPackages((pkgsRes.data ?? []) as unknown as Package[]);
      setInstances(ppRows);
      setAllItems(items);
      setTodos((todosRes.data ?? []) as unknown as ProjectTodo[]);
      setError(null);
    } catch (err) {
      if (isCurrent()) setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    void fetchAll();
  }, [fetchAll]);

  const packageGroups = useMemo<ProjectPackageGroup[]>(() =>
    instances.flatMap(pp => {
      const pkg = packages.find(p => p.id === pp.package_id);
      if (!pkg) return [];
      return [{
        instanceId: pp.id,
        package_id: pp.package_id,
        package:    pkg,
        items:      allItems.filter(i => i.package_instance_id === pp.id),
      }];
    }),
  [instances, packages, allItems]);

  // ── In-use bookkeeping ────────────────────────────────────────────────────

  const restoreAllProjectItems = useCallback(async () => {
    if (projectId) await restoreAllItemsOfProject(projectId);
  }, [projectId]);

  const markInUse = useCallback(
    (projectName: string) => markProjectItemsInUse(allItems, availableInventory, projectName),
    [allItems, availableInventory],
  );

  const markItemsInUse = async (): Promise<boolean> => {
    if (!project) return false;
    try {
      await markInUse(project.name);
      toast({ title: t('project_detail.toast.marked_in_use'), description: t('project_detail.mark_in_use_desc', { name: project.name }) });
      await fetchAll();
      return true;
    } catch (err) { fail(err); return false; }
  };

  // ── Project ops ───────────────────────────────────────────────────────────

  const saveProject = async (updates: ProjectUpdate) => {
    const { data, error: err } = await supabase.from('projects').update(updates).eq('id', projectId ?? '').select().maybeSingle();
    check(err);
    if (data && mountedRef.current) setProject(data as unknown as Project);
  };

  const updateProject = async (updates: ProjectUpdate): Promise<boolean> => {
    try { await saveProject(updates); return true; } catch (err) { fail(err); return false; }
  };

  const deleteProject = async (): Promise<boolean> => {
    try {
      await restoreAllProjectItems();
      const { error: err } = await supabase.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', projectId ?? '');
      check(err);
      return true;
    } catch (err) { fail(err); return false; }
  };

  const toggleFavorite = async (): Promise<boolean> => {
    if (!project) return false;
    return updateProject({ is_favorite: !project.is_favorite });
  };

  /** Changes the status and keeps inventory "in use" flags consistent with it. */
  const updateStatus = async (status: ProjectStatus): Promise<boolean> => {
    if (!project) return false;
    const wasInUse    = IN_USE_STATUSES.includes(project.status);
    const willBeInUse = IN_USE_STATUSES.includes(status);
    try {
      if (wasInUse && !willBeInUse) await restoreAllProjectItems();
      await saveProject({ status });
      if (willBeInUse) {
        await markInUse(project.name);
        toast({ title: t('project_detail.toast.marked_in_use'), description: t('project_detail.mark_in_use_desc', { name: project.name }) });
      }
      await fetchAll();
      return true;
    } catch (err) {
      fail(err);
      await fetchAll();
      return false;
    }
  };

  // ── Package ops ───────────────────────────────────────────────────────────

  const addPackageToProject = async (packageId: string): Promise<boolean> => {
    if (!projectId) return false;
    try {
      const { data: pp, error: ppError } = await supabase
        .from('project_packages')
        .insert({ project_id: projectId, package_id: packageId })
        .select()
        .single();
      check(ppError);

      const { data: pkgItems, error: pkgError } = await supabase.from('package_items').select('*').eq('package_id', packageId);
      check(pkgError);

      if (pkgItems && pkgItems.length > 0) {
        const { error: insError } = await supabase.from('project_items').insert(
          pkgItems.map(pi => ({
            project_id:          projectId,
            inventory_item_id:   pi.inventory_item_id,
            quantity:            pi.quantity,
            source:              'package',
            package_instance_id: pp.id,
            packed:              false,
          })),
        );
        if (insError) {
          // Roll back the empty package instance so the project stays consistent
          await supabase.from('project_packages').delete().eq('id', pp.id);
          check(insError);
        }
      }
      await fetchAll();
      return true;
    } catch (err) { fail(err); return false; }
  };

  const removePackageFromProject = async (instanceId: string): Promise<boolean> => {
    try {
      const inUse = allItems.filter(i =>
        i.package_instance_id === instanceId &&
        availableInventory.find(inv => inv.id === i.inventory_item_id)?.condition === 'in-einsatz');
      await Promise.all(inUse.map(i => restoreInventoryItem(i.inventory_item_id, i.original_location ?? null)));

      const itemsRes = await supabase.from('project_items').delete().eq('package_instance_id', instanceId);
      check(itemsRes.error);
      const ppRes = await supabase.from('project_packages').delete().eq('id', instanceId);
      check(ppRes.error);
      await fetchAll();
      return true;
    } catch (err) { fail(err); await fetchAll(); return false; }
  };

  // ── Item ops ──────────────────────────────────────────────────────────────

  const addDirectItem = async (inventoryItemId: string, quantity: number): Promise<boolean> => {
    if (!projectId) return false;
    try {
      const { error: err } = await supabase.from('project_items').insert({
        project_id: projectId, inventory_item_id: inventoryItemId, quantity, source: 'direct', packed: false,
      });
      check(err);
      await fetchAll();
      return true;
    } catch (err) { fail(err); return false; }
  };

  const removeItem = async (itemId: string): Promise<boolean> => {
    const item = allItems.find(i => i.id === itemId);
    try {
      if (item && availableInventory.find(i => i.id === item.inventory_item_id)?.condition === 'in-einsatz') {
        await restoreInventoryItem(item.inventory_item_id, item.original_location ?? null);
      }
      const { error: err } = await supabase.from('project_items').delete().eq('id', itemId);
      check(err);
      if (mountedRef.current) setAllItems(prev => prev.filter(i => i.id !== itemId));
      return true;
    } catch (err) { fail(err); return false; }
  };

  /** Optimistically patches one item; reverts if the write fails. */
  const patchItem = async (itemId: string, patch: Partial<Pick<EnrichedProjectItem, 'packed' | 'condition' | 'quantity'>>) => {
    const previous = allItems.find(i => i.id === itemId);
    setAllItems(prev => prev.map(i => (i.id === itemId ? { ...i, ...patch } : i)));
    const { error: err } = await supabase.from('project_items').update(patch).eq('id', itemId);
    if (err) {
      if (previous && mountedRef.current) setAllItems(prev => prev.map(i => (i.id === itemId ? previous : i)));
      fail(new Error(err.message));
      return false;
    }
    return true;
  };

  const togglePacked       = (itemId: string, packed: boolean)               => patchItem(itemId, { packed });
  const setItemCondition   = (itemId: string, condition: ItemReturnCondition) => patchItem(itemId, { condition });
  const updateItemQuantity = (itemId: string, quantity: number)               => patchItem(itemId, { quantity });

  // ── Todo ops ──────────────────────────────────────────────────────────────

  /** Appends one or more todos in a single insert (keeps positions sequential). */
  const addTodos = async (titles: string[]): Promise<boolean> => {
    if (!projectId || titles.length === 0) return false;
    const start = todos.length > 0 ? Math.max(...todos.map(td => td.position)) + 1 : 0;
    const { data, error: err } = await supabase
      .from('project_todos')
      .insert(titles.map((title, idx) => ({ project_id: projectId, title, done: false, position: start + idx })))
      .select();
    if (err) { fail(new Error(err.message)); return false; }
    const created = ((data ?? []) as unknown as ProjectTodo[]).sort((a, b) => a.position - b.position);
    if (mountedRef.current) setTodos(prev => [...prev, ...created]);
    return true;
  };

  const addTodo = (title: string) => addTodos([title]);

  const withTodoRollback = async (next: ProjectTodo[], write: () => Promise<{ message: string } | null>) => {
    const previous = todos;
    setTodos(next);
    const err = await write();
    if (err) {
      if (mountedRef.current) setTodos(previous);
      fail(new Error(err.message));
      return false;
    }
    return true;
  };

  const toggleTodo = (todoId: string, done: boolean) =>
    withTodoRollback(
      todos.map(td => (td.id === todoId ? { ...td, done } : td)),
      async () => (await supabase.from('project_todos').update({ done }).eq('id', todoId)).error,
    );

  const deleteTodo = (todoId: string) =>
    withTodoRollback(
      todos.filter(td => td.id !== todoId),
      async () => (await supabase.from('project_todos').delete().eq('id', todoId)).error,
    );

  const reorderTodos = (reordered: ProjectTodo[]) =>
    withTodoRollback(reordered, async () => {
      const results = await Promise.all(
        reordered.map((td, idx) => supabase.from('project_todos').update({ position: idx }).eq('id', td.id)),
      );
      return results.find(r => r.error)?.error ?? null;
    });

  // ── Computed ──────────────────────────────────────────────────────────────
  const directItems = useMemo(() => allItems.filter(i => i.source === 'direct'), [allItems]);
  const totalItems  = allItems.length;
  const packedItems = allItems.filter(i => i.packed).length;

  return {
    project, packageGroups, directItems, allItems, todos, loading, error, availableInventory,
    totalItems, packedItems,
    updateProject, deleteProject, toggleFavorite, updateStatus, markItemsInUse,
    addPackageToProject, removePackageFromProject,
    addDirectItem, removeItem, togglePacked, setItemCondition, updateItemQuantity,
    addTodo, addTodos, toggleTodo, deleteTodo, reorderTodos,
    refetch: fetchAll,
    /** Throws on failure — meant to be composed into larger flows (archive). */
    restoreAllProjectItems,
  };
}
