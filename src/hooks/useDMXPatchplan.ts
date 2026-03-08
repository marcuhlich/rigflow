import { useMemo, useCallback, useState, useEffect } from 'react';
import { useInventory } from './useInventory';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const { allItems, updateItem } = useInventory();
  const { user } = useAuth();
  const { toast } = useToast();
  const [instanceConfigs, setInstanceConfigs] = useState<DMXInstanceConfig[]>([]);

  // Fetch per-instance configs
  const fetchInstanceConfigs = useCallback(async () => {
    if (!user) { setInstanceConfigs([]); return; }
    const { data, error } = await supabase
      .from('dmx_instances')
      .select('*');
    if (!error && data) {
      setInstanceConfigs(data as DMXInstanceConfig[]);
    }
  }, [user]);

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
        toast({ title: 'Fehler', description: 'Gerät nicht gefunden', variant: 'destructive' });
        return;
      }

      if (newStartAddress < 1 || newStartAddress > 512) {
        toast({ title: 'Fehler', description: 'Ungültige DMX-Adresse (1-512)', variant: 'destructive' });
        return;
      }

      const endAddress = newStartAddress + item.dmx_channels - 1;
      if (endAddress > 512) {
        toast({
          title: 'Fehler',
          description: `Benötigt ${item.dmx_channels} Kanäle. Nicht genug Platz ab Adresse ${newStartAddress}.`,
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
          title: 'Gespeichert',
          description: `Instanz ${instanceNumber}: Adresse ${newStartAddress}–${endAddress}, Universe ${newUniverse}`,
        });
      } catch (error) {
        toast({ title: 'Fehler', description: 'Konnte nicht gespeichert werden.', variant: 'destructive' });
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
        toast({ title: 'Zurückgesetzt', description: `Instanz ${instanceNumber} nutzt wieder Standard-Adressen.` });
      } catch {
        toast({ title: 'Fehler', variant: 'destructive' });
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
        toast({ title: 'Erfolg', description: `Basis-Adresse aktualisiert: ${newStartAddress}` });
      } catch {
        toast({ title: 'Fehler', variant: 'destructive' });
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
        toast({ title: 'Erfolg', description: `Universe aktualisiert: ${newUniverse}` });
      } catch {
        toast({ title: 'Fehler', variant: 'destructive' });
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
        toast({ title: 'Fehler', description: `Nicht genug Platz in Universe ${universe}`, variant: 'destructive' });
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
