/**
 * Supabase data helpers for the project detail view. All functions throw an
 * Error when a request fails (Supabase resolves with `{ error }` instead of
 * rejecting), so callers can compose them and handle failures in one place.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { EnrichedProjectItem, ItemReturnCondition } from '@/hooks/useProjectDetail';
import type { InventoryItem } from '@/types/inventory';

type ProjectItemRow = Tables<'project_items'>;

export function check(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export function toCondition(value: string | null): ItemReturnCondition {
  return value === 'damaged' || value === 'missing' ? value : 'ok';
}

export function toProjectItem(row: ProjectItemRow): EnrichedProjectItem {
  return {
    id:                  row.id,
    project_id:          row.project_id,
    inventory_item_id:   row.inventory_item_id,
    quantity:            row.quantity,
    packed:              row.packed,
    source:              row.source === 'package' ? 'package' : 'direct',
    package_instance_id: row.package_instance_id,
    notes:               row.notes,
    condition:           toCondition(row.condition),
    created_at:          row.created_at,
    original_location:   row.original_location,
  };
}

/** Resets an inventory item to "available" at its original location. Throws on failure. */
export async function restoreInventoryItem(inventoryItemId: string, originalLocation: string | null) {
  const { error } = await supabase
    .from('inventory_items')
    .update({ condition: 'verfügbar', location: originalLocation, lent_to: null, lent_until: null })
    .eq('id', inventoryItemId);
  check(error);
}

/**
 * Synchronises the project_items of one project_package with the current
 * package contents: adds missing items, removes deleted ones, updates
 * quantities. Keeps packed/condition/original_location of existing rows.
 */
export async function syncPackageInstanceItems(projectId: string, ppId: string, packageId: string) {
  const [pkgItemsRes, projItemsRes] = await Promise.all([
    supabase.from('package_items').select('*').eq('package_id', packageId),
    supabase.from('project_items').select('*').eq('package_instance_id', ppId),
  ]);
  check(pkgItemsRes.error);
  check(projItemsRes.error);

  const pkgItems  = pkgItemsRes.data ?? [];
  const projItems = projItemsRes.data ?? [];
  const pkgByInv  = new Map(pkgItems.map(pi => [pi.inventory_item_id, pi]));
  const projByInv = new Map(projItems.map(pi => [pi.inventory_item_id, pi]));

  const toAdd = pkgItems.filter(pi => !projByInv.has(pi.inventory_item_id));
  if (toAdd.length > 0) {
    const { error } = await supabase.from('project_items').insert(
      toAdd.map(pi => ({
        project_id:          projectId,
        inventory_item_id:   pi.inventory_item_id,
        quantity:            pi.quantity,
        source:              'package',
        package_instance_id: ppId,
        packed:              false,
      })),
    );
    check(error);
  }

  const toRemove = projItems.filter(pi => !pkgByInv.has(pi.inventory_item_id));
  if (toRemove.length > 0) {
    const { error } = await supabase.from('project_items').delete().in('id', toRemove.map(pi => pi.id));
    check(error);
    // Only items that were marked "in use" have a known original location
    await Promise.all(
      toRemove
        .filter(pi => pi.original_location != null)
        .map(pi => restoreInventoryItem(pi.inventory_item_id, pi.original_location)),
    );
  }

  await Promise.all(
    projItems.map(async pi => {
      const pkgItem = pkgByInv.get(pi.inventory_item_id);
      if (!pkgItem || pkgItem.quantity === pi.quantity) return;
      const { error } = await supabase.from('project_items').update({ quantity: pkgItem.quantity }).eq('id', pi.id);
      check(error);
    }),
  );
}

/**
 * Resets every inventory item of a project to "available". Also catches
 * orphans that are still "in use" at the project's location. Throws on failure.
 */
export async function restoreAllItemsOfProject(projectId: string) {
  const [itemsRes, projRes] = await Promise.all([
    supabase.from('project_items').select('inventory_item_id, original_location').eq('project_id', projectId),
    supabase.from('projects').select('name').eq('id', projectId).maybeSingle(),
  ]);
  check(itemsRes.error);
  check(projRes.error);

  await Promise.all(
    (itemsRes.data ?? [])
      .filter(pi => pi.inventory_item_id)
      .map(pi => restoreInventoryItem(pi.inventory_item_id, pi.original_location ?? null)),
  );

  if (projRes.data?.name) {
    const { error } = await supabase
      .from('inventory_items')
      .update({ condition: 'verfügbar' })
      .eq('location', projRes.data.name)
      .eq('condition', 'in-einsatz');
    check(error);
  }
}

/** Marks all project items "in use" at the project location. Throws on failure. */
export async function markProjectItemsInUse(
  items: EnrichedProjectItem[],
  inventory: InventoryItem[],
  projectName: string,
) {
  const invById = new Map(inventory.map(i => [i.id, i]));
  // Skip items that are already in use here: re-marking would overwrite
  // their stored original location with the project name.
  const toMark = items.filter(i => {
    const inv = invById.get(i.inventory_item_id);
    return inv && !(inv.condition === 'in-einsatz' && inv.location === projectName);
  });
  if (toMark.length === 0) return;

  const results = await Promise.all(toMark.map(i =>
    supabase.from('project_items')
      .update({ original_location: invById.get(i.inventory_item_id)?.location ?? null })
      .eq('id', i.id),
  ));
  results.forEach(r => check(r.error));

  const ids = [...new Set(toMark.map(i => i.inventory_item_id))];
  const { error } = await supabase
    .from('inventory_items')
    .update({ condition: 'in-einsatz', location: projectName })
    .in('id', ids);
  check(error);
}
