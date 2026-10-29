import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useInventory } from './useInventory';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import i18n from '@/i18n';

const t = i18n.t.bind(i18n);
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  PatchplanRow,
  DMXConflict,
  DMXInstanceConfig,
  generatePatchplan,
  findConflicts,
  calculateUniverseUsage,
  findNextAvailableChannel,
} from '@/lib/dmxPatchplan';

export function useDMXPatchplan() {
  const { allItems, updateItem, loading: inventoryLoading } = useInventory();
  const { user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const [instanceConfigs, setInstanceConfigs] = useState<DMXInstanceConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(true);

  // Fetch per-instance configs
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchInstanceConfigs = useCallback(async () => {
    if (!userId) {
      if (mountedRef.current) { setInstanceConfigs([]); setConfigsLoading(false); }
      return;
    }
    try {
      const { data, error } = await supabase
        .from('dmx_instances')
        .select('*');
      if (error) throw error;
      if (mountedRef.current) setInstanceConfigs((data ?? []) as DMXInstanceConfig[]);
    } catch (error) {
      logger.error('useDMXPatchplan', 'Failed to load DMX instance configs', error);
    } finally {
      if (mountedRef.current) setConfigsLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchInstanceConfigs(); }, [fetchInstanceConfigs]);

  const patchplan = useMemo((): PatchplanRow[] => {
    return generatePatchplan(allItems, instanceConfigs);
  }, [allItems, instanceConfigs]);

  const conflicts = useMemo((): DMXConflict[] => {
    return findConflicts(patchplan);
  }, [patchplan]);

  const universeUsage = useMemo(() => {
    return calculateUniverseUsage(patchplan);
  }, [patchplan]);

  const patchplanByUniverse = useMemo(() => {
    const grouped = new Map<number, PatchplanRow[]>();
    patchplan.forEach(row => {
      if (!grouped.has(row.universe)) grouped.set(row.universe, []);
      grouped.get(row.universe)!.push(row);
    });
    return grouped;
  }, [patchplan]);

  /**
   * Update a single instance's DMX address and/or universe.
   * Creates or updates a record in dmx_instances.
   */
  const updateInstanceDMX = useCallback(
    async (itemId: string, instanceNumber: number, newStartAddress: number, newUniverse: number) => {
      const item = allItems.find(i => i.id === itemId);
      if (!item || !item.dmx_channels) {
        toast({ title: t('dmx.toast.error', { defaultValue: 'Fehler' }), description: t('dmx.toast.device_not_found', { defaultValue: 'Gerät nicht gefunden' }), variant: 'destructive' });
        return;
      }

      if (newStartAddress < 1 || newStartAddress > 512) {
        toast({ title: t('dmx.toast.error', { defaultValue: 'Fehler' }), description: t('dmx.toast.invalid_address', { defaultValue: 'Ungültige DMX-Adresse (1-512)' }), variant: 'destructive' });
        return;
      }

      const endAddress = newStartAddress + item.dmx_channels - 1;
      if (endAddress > 512) {
        toast({
          title: t('dmx.toast.error', { defaultValue: 'Fehler' }),
          description: t('dmx.toast.not_enough_space_from', { defaultValue: 'Benötigt {{channels}} Kanäle. Nicht genug Platz ab Adresse {{address}}.', channels: item.dmx_channels, address: newStartAddress }),
          variant: 'destructive',
        });
        return;
      }

      try {
        // Upsert: insert or update the instance config
        const { error } = await supabase
          .from('dmx_instances')
          .upsert(
            {
              item_id: itemId,
              instance_number: instanceNumber,
              dmx_start_address: newStartAddress,
              dmx_universe: newUniverse,
            },
            { onConflict: 'item_id,instance_number' }
          );

        if (error) throw error;

        await fetchInstanceConfigs();
        toast({
          title: t('dmx.toast.saved', { defaultValue: 'Gespeichert' }),
          description: t('dmx.toast.instance_saved', { defaultValue: 'Instanz {{instance}}: Adresse {{start}}–{{end}}, Universe {{universe}}', instance: instanceNumber, start: newStartAddress, end: endAddress, universe: newUniverse }),
        });
      } catch (error) {
        logger.error('useDMXPatchplan', 'Failed to save instance DMX config', error);
        toast({ title: t('dmx.toast.error', { defaultValue: 'Fehler' }), description: t('dmx.toast.save_failed', { defaultValue: 'Konnte nicht gespeichert werden.' }), variant: 'destructive' });
      }
    },
    [allItems, fetchInstanceConfigs, toast]
  );

  /**
   * Remove custom config for an instance (revert to consecutive default)
   */
  const resetInstanceDMX = useCallback(
    async (itemId: string, instanceNumber: number) => {
      try {
        const { error } = await supabase
          .from('dmx_instances')
          .delete()
          .eq('item_id', itemId)
          .eq('instance_number', instanceNumber);
        if (error) throw error;
        await fetchInstanceConfigs();
        toast({ title: t('dmx.toast.reset', { defaultValue: 'Zurückgesetzt' }), description: t('dmx.toast.instance_reset', { defaultValue: 'Instanz {{instance}} nutzt wieder Standard-Adressen.', instance: instanceNumber }) });
      } catch (error) {
        logger.error('useDMXPatchplan', 'Failed to reset instance DMX config', error);
        toast({ title: t('dmx.toast.error', { defaultValue: 'Fehler' }), description: t('dmx.toast.reset_failed', { defaultValue: 'Konnte nicht zurückgesetzt werden.' }), variant: 'destructive' });
      }
    },
    [fetchInstanceConfigs, toast]
  );

  // Legacy: update the base item address (for single-instance devices or changing base)
  const updateItemDMXAddress = useCallback(
    async (itemId: string, newStartAddress: number) => {
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;
      try {
        await updateItem(itemId, { ...item, dmx_start_address: newStartAddress });
        toast({ title: t('dmx.toast.success', { defaultValue: 'Erfolg' }), description: t('dmx.toast.base_address_updated', { defaultValue: 'Basis-Adresse aktualisiert: {{address}}', address: newStartAddress }) });
      } catch (error) {
        // updateItem already showed an error toast
        logger.error('useDMXPatchplan', 'Failed to update base DMX address', error);
      }
    },
    [allItems, updateItem, toast]
  );

  const updateItemDMXUniverse = useCallback(
    async (itemId: string, newUniverse: number) => {
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;
      try {
        await updateItem(itemId, { ...item, dmx_universe: newUniverse });
        toast({ title: t('dmx.toast.success', { defaultValue: 'Erfolg' }), description: t('dmx.toast.universe_updated', { defaultValue: 'Universe aktualisiert: {{universe}}', universe: newUniverse }) });
      } catch (error) {
        // updateItem already showed an error toast
        logger.error('useDMXPatchplan', 'Failed to update DMX universe', error);
      }
    },
    [allItems, updateItem, toast]
  );

  const autoAssignNextAvailable = useCallback(
    async (itemId: string, universe: number = 1) => {
      const item = allItems.find(i => i.id === itemId);
      if (!item || !item.dmx_channels) return;
      const nextCh = findNextAvailableChannel(patchplan, universe, item.dmx_channels);
      if (nextCh === -1) {
        toast({ title: t('dmx.toast.error', { defaultValue: 'Fehler' }), description: t('dmx.toast.universe_full', { defaultValue: 'Nicht genug Platz in Universe {{universe}}', universe }), variant: 'destructive' });
        return;
      }
      await updateItemDMXAddress(itemId, nextCh);
    },
    [allItems, patchplan, updateItemDMXAddress, toast]
  );

  const hasConflict = useCallback(
    (itemId: string): boolean => conflicts.some(c => c.row1.itemId === itemId || c.row2.itemId === itemId),
    [conflicts]
  );

  const getConflictsForItem = useCallback(
    (itemId: string): DMXConflict[] => conflicts.filter(c => c.row1.itemId === itemId || c.row2.itemId === itemId),
    [conflicts]
  );

  return {
    /** true while inventory items or per-instance configs are still loading */
    loading: inventoryLoading || configsLoading,
    patchplan,
    conflicts,
    universeUsage,
    patchplanByUniverse,
    updateItemDMXAddress,
    updateItemDMXUniverse,
    updateInstanceDMX,
    resetInstanceDMX,
    autoAssignNextAvailable,
    hasConflict,
    getConflictsForItem,
  };
}
