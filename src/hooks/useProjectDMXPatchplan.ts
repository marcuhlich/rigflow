/**
 * useProjectDMXPatchplan.ts
 *
 * Projekt-isolierter DMX-Patchplan.
 * - Liest/schreibt nur in `project_dmx_instances` (project_id-gebunden)
 * - Quantity kommt aus dem Projekt-Item (nicht Inventar-Bestand)
 *   → 20x PAR im Inventar, 10x im Projekt → nur 10 Instanzen im Patchplan
 */
import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useInventory } from './useInventory';
import { useToast }     from './use-toast';
import { supabase }     from '@/integrations/supabase/client';
import { logger }       from '@/lib/logger';
import {
  PatchplanRow,
  DMXConflict,
  DMXInstanceConfig,
  generatePatchplan,
  findConflicts,
  calculateUniverseUsage,
  findNextAvailableChannel,
} from '@/lib/dmxPatchplan';
import { EnrichedProjectItem } from './useProjectDetail';
import i18n from '@/i18n';

interface ProjectDMXInstance {
  id:                string;
  project_id:        string;
  item_id:           string;
  instance_number:   number;
  dmx_start_address: number;
  dmx_universe:      number;
}

export function useProjectDMXPatchplan(
  projectId:    string | undefined,
  projectItems: EnrichedProjectItem[]
) {
  const { allItems } = useInventory();
  const { toast }    = useToast();

  const [projectConfigs, setProjectConfigs] = useState<ProjectDMXInstance[]>([]);
  const [loading, setLoading]               = useState(true);

  const projectInventoryItemIds = useMemo(
    () => new Set(projectItems.map(i => i.inventory_item_id).filter(Boolean) as string[]),
    [projectItems]
  );

  /**
   * Inventory-Items mit Projekt-Menge überschreiben.
   * generatePatchplan nutzt item.quantity für die Anzahl der Instanzen.
   * Durch das Überschreiben werden nur die tatsächlich im Projekt
   * verwendeten Geräte als Instanzen im Patchplan angezeigt.
   */
  const projectInventoryItems = useMemo(() => {
    const byInventoryId = new Map<string, EnrichedProjectItem>();
    projectItems.forEach(pi => {
      if (pi.inventory_item_id && !byInventoryId.has(pi.inventory_item_id)) byInventoryId.set(pi.inventory_item_id, pi);
    });
    return allItems
      .filter(i => projectInventoryItemIds.has(i.id))
      .map(i => {
        const projectItem = byInventoryId.get(i.id);
        return projectItem ? { ...i, quantity: projectItem.quantity } : i;
      });
  }, [allItems, projectInventoryItemIds, projectItems]);

  // Guards against out-of-order responses (project switch) and updates after unmount
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchProjectConfigs = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => mountedRef.current && requestId === requestIdRef.current;
    if (!projectId) { setProjectConfigs([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('project_dmx_instances')
      .select('*')
      .eq('project_id', projectId);
    if (!isCurrent()) return;
    if (error) logger.error('useProjectDMXPatchplan', 'Failed to load project DMX configs', error);
    else setProjectConfigs((data ?? []) as ProjectDMXInstance[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchProjectConfigs(); }, [fetchProjectConfigs]);

  const dmxInstanceConfigs = useMemo<DMXInstanceConfig[]>(
    () => projectConfigs.map(c => ({
      id: c.id, item_id: c.item_id,
      instance_number: c.instance_number,
      dmx_start_address: c.dmx_start_address,
      dmx_universe: c.dmx_universe,
    })),
    [projectConfigs]
  );

  const patchplan     = useMemo(() => generatePatchplan(projectInventoryItems, dmxInstanceConfigs), [projectInventoryItems, dmxInstanceConfigs]);
  const conflicts     = useMemo(() => findConflicts(patchplan),          [patchplan]);
  const universeUsage = useMemo(() => calculateUniverseUsage(patchplan), [patchplan]);

  const updateInstanceDMX = useCallback(
    async (itemId: string, instanceNumber: number, newStartAddress: number, newUniverse: number) => {
      if (!projectId) return;
      const item = projectInventoryItems.find(i => i.id === itemId);
      if (!item?.dmx_channels) {
        toast({ title: i18n.t('common.error'), description: i18n.t('feedback.device_not_found'), variant: 'destructive' });
        return;
      }
      if (newStartAddress < 1 || newStartAddress > 512) {
        toast({ title: i18n.t('common.error'), description: i18n.t('feedback.dmx_invalid_address'), variant: 'destructive' });
        return;
      }
      const endAddress = newStartAddress + item.dmx_channels - 1;
      if (endAddress > 512) {
        toast({ title: i18n.t('common.error'), description: i18n.t('feedback.dmx_no_room', { channels: item.dmx_channels, start: newStartAddress }), variant: 'destructive' });
        return;
      }
      try {
        const { error } = await supabase
          .from('project_dmx_instances')
          .upsert(
            { project_id: projectId, item_id: itemId, instance_number: instanceNumber, dmx_start_address: newStartAddress, dmx_universe: newUniverse },
            { onConflict: 'project_id,item_id,instance_number' }
          );
        if (error) throw error;
        await fetchProjectConfigs();
        toast({ title: i18n.t('feedback.saved'), description: i18n.t('feedback.dmx_instance_saved', { instance: instanceNumber, start: newStartAddress, end: endAddress, universe: newUniverse }) });
      } catch (error) {
        logger.error('useProjectDMXPatchplan', 'Failed to save instance config', error);
        toast({ title: i18n.t('common.error'), description: i18n.t('feedback.save_failed'), variant: 'destructive' });
      }
    },
    [projectId, projectInventoryItems, fetchProjectConfigs, toast]
  );

  const resetInstanceDMX = useCallback(
    async (itemId: string, instanceNumber: number) => {
      if (!projectId) return;
      try {
        const { error } = await supabase
          .from('project_dmx_instances')
          .delete()
          .eq('project_id', projectId)
          .eq('item_id', itemId)
          .eq('instance_number', instanceNumber);
        if (error) throw error;
        await fetchProjectConfigs();
        toast({ title: i18n.t('feedback.reset'), description: i18n.t('feedback.dmx_instance_reset') });
      } catch (error) {
        logger.error('useProjectDMXPatchplan', 'Failed to reset instance config', error);
        toast({ title: i18n.t('common.error'), variant: 'destructive' });
      }
    },
    [projectId, fetchProjectConfigs, toast]
  );

  const autoAssignNextAvailable = useCallback(
    async (itemId: string, universe: number = 1) => {
      const item = projectInventoryItems.find(i => i.id === itemId);
      if (!item?.dmx_channels) return;
      const nextCh = findNextAvailableChannel(patchplan, universe, item.dmx_channels);
      if (nextCh === -1) {
        toast({ title: i18n.t('common.error'), description: i18n.t('feedback.dmx_no_free_block', { channels: item.dmx_channels, universe }), variant: 'destructive' });
        return;
      }
      const existingRow    = patchplan.find(r => r.itemId === itemId && r.universe === universe);
      const instanceNumber = existingRow?.instanceNumber ?? 1;
      await updateInstanceDMX(itemId, instanceNumber, nextCh, universe);
    },
    [projectInventoryItems, patchplan, updateInstanceDMX, toast]
  );

  return { patchplan, conflicts, universeUsage, loading, projectInventoryItems, updateInstanceDMX, resetInstanceDMX, autoAssignNextAvailable };
}