import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Project, ProjectItem, ProjectTodo, Package, ProjectStatus } from '@/types/project';
import { InventoryItem } from '@/types/inventory';

export interface EnrichedProjectItem extends ProjectItem {
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

// ─── Inventory-Condition zurücksetzen ─────────────────────────────────────────
// Hilfsfunktion: setzt ein Inventory-Item zurück auf 'verfügbar' + Originalstandort
async function restoreInventoryItem(
  inventoryItemId: string,
  originalLocation: string | null,
) {
  await supabase
    .from('inventory_items')
    .update({
      condition: 'verfügbar',
      location: originalLocation,
      lent_to: null,
      lent_until: null,
    } as any)
    .eq('id', inventoryItemId);
}

// ─── Paket-Sync ───────────────────────────────────────────────────────────────
// Synchronisiert project_items für ein bestimmtes project_package mit dem
// aktuellen Inhalt des Pakets. Fügt fehlende Items hinzu, entfernt gelöschte.
// Preserviert packed/condition/original_location der existierenden Items.
async function syncPackageInstanceItems(
  projectId: string,
  ppId: string,         // project_packages.id
  packageId: string,
) {
  const [pkgItemsRes, projItemsRes] = await Promise.all([
    supabase.from('package_items').select('*').eq('package_id', packageId),
    supabase.from('project_items').select('*').eq('package_instance_id', ppId),
  ]);

  const pkgItems  = (pkgItemsRes.data  ?? []) as any[];
  const projItems = (projItemsRes.data ?? []) as any[];

  const pkgInvIdToItem  = new Map(pkgItems.map(pi => [pi.inventory_item_id, pi]));
  const projInvIdToItem = new Map(projItems.map(pi => [pi.inventory_item_id, pi]));

  // Items hinzufügen die im Paket sind, aber noch nicht im Projekt
  const toAdd = pkgItems.filter(pi => !projInvIdToItem.has(pi.inventory_item_id));
  if (toAdd.length > 0) {
    await supabase.from('project_items').insert(
      toAdd.map((pi: any) => ({
        project_id: projectId,
        inventory_item_id: pi.inventory_item_id,
        quantity: pi.quantity,
        source: 'package',
        package_instance_id: ppId,
        packed: false,
      } as any)),
    );
  }

  // Items entfernen die nicht mehr im Paket sind
  const toRemove = projItems.filter(pi => !pkgInvIdToItem.has(pi.inventory_item_id));
  if (toRemove.length > 0) {
    await supabase
      .from('project_items')
      .delete()
      .in('id', toRemove.map((pi: any) => pi.id));

    // Inventory-Items die durch dieses Paket im Einsatz waren zurücksetzen
    for (const pi of toRemove) {
      if (pi.original_location !== undefined && pi.original_location !== null) {
        // Nur zurücksetzen wenn der Originalstandort bekannt ist (d.h. es wurde markiert)
        await restoreInventoryItem(pi.inventory_item_id, pi.original_location);
      }
    }
  }

  // Mengen aktualisieren falls sie sich im Paket geändert haben
  const toUpdate = projItems.filter(pi => {
    const pkgItem = pkgInvIdToItem.get(pi.inventory_item_id);
    return pkgItem && pkgItem.quantity !== pi.quantity;
  });
  for (const pi of toUpdate) {
    const pkgItem = pkgInvIdToItem.get(pi.inventory_item_id);
    if (pkgItem) {
      await supabase
        .from('project_items')
        .update({ quantity: pkgItem.quantity } as any)
        .eq('id', pi.id);
    }
  }
}

export function useProjectDetail(projectId: string | undefined) {
  const [project,            setProject]            = useState<Project | null>(null);
  const [allItems,           setAllItems]           = useState<EnrichedProjectItem[]>([]);
  const [packageGroups,      setPackageGroups]      = useState<ProjectPackageGroup[]>([]);
  const [todos,              setTodos]              = useState<ProjectTodo[]>([]);
  const [availableInventory, setAvailableInventory] = useState<InventoryItem[]>([]);
  const [loading,            setLoading]            = useState(true);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    if (!projectId) return;
    try {
      const [projRes, ppRes, piRes, todosRes, invRes, pkgsRes] = await Promise.all([
        supabase.from('projects').select('*').eq('id', projectId).single(),
        supabase.from('project_packages').select('*').eq('project_id', projectId),
        supabase.from('project_items').select('*').eq('project_id', projectId),
        supabase.from('project_todos').select('*').eq('project_id', projectId).order('position'),
        supabase.from('inventory_items').select('*').is('deleted_at', null),
        supabase.from('packages').select('*'),
      ]);

      if (projRes.error) throw projRes.error;
      setProject(projRes.data as unknown as Project);

      const inv  = (invRes.data  ?? []) as unknown as InventoryItem[];
      const pkgs = (pkgsRes.data ?? []) as unknown as Package[];
      setAvailableInventory(inv);

      // ── Pakete synchronisieren (Bug 1 Fix) ───────────────────────────────
      // Für jedes project_package den Paketinhalt mit project_items abgleichen.
      // Das stellt sicher dass Änderungen am Paket hier sichtbar werden.
      const ppData = (ppRes.data ?? []) as any[];
      for (const pp of ppData) {
        await syncPackageInstanceItems(projectId, pp.id, pp.package_id);
      }

      // Jetzt project_items erneut laden (nach Sync)
      const { data: freshPiData } = await supabase
        .from('project_items')
        .select('*')
        .eq('project_id', projectId);

      const enriched: EnrichedProjectItem[] = ((freshPiData ?? []) as any[]).map(i => {
        const found = inv.find(x => x.id === i.inventory_item_id);
        return {
          ...i,
          item_name:     found?.name,
          item_category: found?.category,
          item_location: found?.location,
        };
      });
      setAllItems(enriched);

      const groups: ProjectPackageGroup[] = ppData
        .map(pp => ({
          instanceId: pp.id,
          package_id: pp.package_id,
          package: pkgs.find(p => p.id === pp.package_id)!,
          items: enriched.filter(i => i.package_instance_id === pp.id),
        }))
        .filter(g => g.package);
      setPackageGroups(groups);

      setTodos((todosRes.data ?? []) as unknown as ProjectTodo[]);
    } catch (err) {
      toast({ title: 'Fehler', description: 'Projekt konnte nicht geladen werden.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Alle "Im Einsatz"-Items dieses Projekts zurücksetzen ─────────────────
  // Erfasst ALLE Items — auch solche die bereits aus project_items gelöscht wurden
  // (über den Standort-Fallback, Bug 5 Fix)
  const restoreAllProjectItems = useCallback(async () => {
    if (!projectId) return;

    // 1. Items über project_items zurücksetzen (mit bekanntem Originalstandort)
    const { data: currentProjItems } = await supabase
      .from('project_items')
      .select('*')
      .eq('project_id', projectId);

    for (const pi of (currentProjItems ?? []) as any[]) {
      if (!pi.inventory_item_id) continue;
      await restoreInventoryItem(pi.inventory_item_id, pi.original_location ?? null);
    }

    // 2. Orphan-Cleanup: Items die im Einsatz sind und dieses Projekt als
    //    Standort haben aber nicht mehr in project_items auftauchen
    // (passiert wenn removeItem aufgerufen wurde ohne restore, Bug 4 Fix)
    const { data: projData } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    if (projData?.name) {
      await supabase
        .from('inventory_items')
        .update({ condition: 'verfügbar' } as any)
        .eq('location', projData.name)
        .eq('condition', 'in-einsatz');
    }
  }, [projectId]);

  // ── Project ops ───────────────────────────────────────────────────────────
  const updateProject = async (
    updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>>,
  ) => {
    const { error } = await supabase.from('projects').update(updates as any).eq('id', projectId!);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchAll();
  };

  const deleteProject = async () => {
    // Bug Fix: Items restoren bevor Projekt gelöscht wird
    await restoreAllProjectItems();

    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', projectId!);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
  };

  const toggleFavorite = async () => {
    if (!project) return;
    await updateProject({ is_favorite: !project.is_favorite });
  };

  const updateStatus = async (status: ProjectStatus) => {
    // Edge Case: Wenn Status zurückgesetzt wird (z.B. transit → planned),
    // Items aus dem Einsatz nehmen
    const previousStatus = project?.status;
    const inUseStatuses: ProjectStatus[] = ['transit', 'live', 'returning'];
    const wasInUse = previousStatus && inUseStatuses.includes(previousStatus);
    const willBeInUse = inUseStatuses.includes(status);

    if (wasInUse && !willBeInUse) {
      await restoreAllProjectItems();
    }

    await updateProject({ status });
  };

  // ── Package ops ───────────────────────────────────────────────────────────
  const addPackageToProject = async (packageId: string) => {
    const { data: pp, error } = await supabase
      .from('project_packages')
      .insert({ project_id: projectId, package_id: packageId } as any)
      .select()
      .single();
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }

    // Paketinhalt in project_items kopieren
    const { data: pkgItems } = await supabase
      .from('package_items')
      .select('*')
      .eq('package_id', packageId);

    if (pkgItems && pkgItems.length > 0) {
      await supabase.from('project_items').insert(
        (pkgItems as any[]).map(pi => ({
          project_id:          projectId,
          inventory_item_id:   pi.inventory_item_id,
          quantity:            pi.quantity,
          source:              'package',
          package_instance_id: (pp as any).id,
          packed:              false,
        } as any)),
      );
    }
    await fetchAll();
  };

  const removePackageFromProject = async (instanceId: string) => {
    // Bug Fix: Items restoren die zu diesem Paket gehören und im Einsatz sind
    const packageItems = allItems.filter(i => i.package_instance_id === instanceId);
    for (const item of packageItems) {
      if (!item.inventory_item_id) continue;
      const invItem = availableInventory.find(i => i.id === item.inventory_item_id);
      if (invItem?.condition === 'in-einsatz') {
        await restoreInventoryItem(item.inventory_item_id, (item as any).original_location ?? null);
      }
    }

    await supabase.from('project_items').delete().eq('package_instance_id', instanceId);
    await supabase.from('project_packages').delete().eq('id', instanceId);
    await fetchAll();
  };

  // ── Item ops ──────────────────────────────────────────────────────────────
  const addDirectItem = async (inventoryItemId: string, quantity: number) => {
    const { error } = await supabase.from('project_items').insert({
      project_id:        projectId,
      inventory_item_id: inventoryItemId,
      quantity,
      source:            'direct',
      packed:            false,
    } as any);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchAll();
  };

  const removeItem = async (itemId: string) => {
    // Bug Fix: Inventory-Item zurücksetzen wenn es für dieses Projekt im Einsatz war
    const projItem = allItems.find(i => i.id === itemId);
    if (projItem?.inventory_item_id) {
      const invItem = availableInventory.find(i => i.id === projItem.inventory_item_id);
      if (invItem?.condition === 'in-einsatz') {
        const originalLocation = (projItem as any).original_location ?? null;
        await restoreInventoryItem(projItem.inventory_item_id, originalLocation);
      }
    }

    await supabase.from('project_items').delete().eq('id', itemId);
    setAllItems(prev => prev.filter(i => i.id !== itemId));
    setPackageGroups(prev => prev.map(g => ({
      ...g,
      items: g.items.filter(i => i.id !== itemId),
    })));
  };

  const togglePacked = async (itemId: string, packed: boolean) => {
    // Optimistisch
    setAllItems(prev => prev.map(i => i.id === itemId ? { ...i, packed } : i));
    setPackageGroups(prev => prev.map(g => ({
      ...g,
      items: g.items.map(i => i.id === itemId ? { ...i, packed } : i),
    })));
    await supabase.from('project_items').update({ packed } as any).eq('id', itemId);
  };

  // ── Todo ops ──────────────────────────────────────────────────────────────
  const addTodo = async (title: string) => {
    const maxPos = todos.length > 0 ? Math.max(...todos.map(t => t.position)) + 1 : 0;
    const { data, error } = await supabase
      .from('project_todos')
      .insert({ project_id: projectId, title, done: false, position: maxPos } as any)
      .select()
      .single();
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); return; }
    setTodos(prev => [...prev, data as unknown as ProjectTodo]);
  };

  const toggleTodo = async (todoId: string, done: boolean) => {
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, done } : t));
    await supabase.from('project_todos').update({ done } as any).eq('id', todoId);
  };

  const deleteTodo = async (todoId: string) => {
    setTodos(prev => prev.filter(t => t.id !== todoId));
    await supabase.from('project_todos').delete().eq('id', todoId);
  };

  const reorderTodos = async (reordered: ProjectTodo[]) => {
    setTodos(reordered);
    await Promise.all(
      reordered.map((t, idx) =>
        supabase.from('project_todos').update({ position: idx } as any).eq('id', t.id),
      ),
    );
  };

  // ── Computed ──────────────────────────────────────────────────────────────
  const directItems = allItems.filter(i => i.source === 'direct');
  const totalItems  = allItems.length;
  const packedItems = allItems.filter(i => i.packed).length;

  return {
    project, packageGroups, directItems, allItems, todos, loading, availableInventory,
    totalItems, packedItems,
    updateProject, deleteProject, toggleFavorite, updateStatus,
    addPackageToProject, removePackageFromProject,
    addDirectItem, removeItem, togglePacked,
    addTodo, toggleTodo, deleteTodo, reorderTodos,
    refetch: fetchAll,
    // Für ProjectDetail: explizit exportiert damit handleFinalize es nutzen kann
    restoreAllProjectItems,
  };
}