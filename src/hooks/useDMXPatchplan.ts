import { useMemo, useCallback } from 'react';
import { useInventory } from './useInventory';
import { useToast } from './use-toast';
import {
  PatchplanRow,
  DMXConflict,
  generatePatchplan,
  findConflicts,
  calculateUniverseUsage,
  findNextAvailableChannel,
} from '@/lib/dmxPatchplan';

export function useDMXPatchplan() {
  const { allItems, updateItem } = useInventory();
  const { toast } = useToast();

  // Generiere den kompletten Patchplan
  const patchplan = useMemo((): PatchplanRow[] => {
    return generatePatchplan(allItems);
  }, [allItems]);

  // Finde alle Konflikte
  const conflicts = useMemo((): DMXConflict[] => {
    return findConflicts(patchplan);
  }, [patchplan]);

  // Berechne Universe-Auslastung
  const universeUsage = useMemo(() => {
    return calculateUniverseUsage(patchplan);
  }, [patchplan]);

  // Gruppiere Patchplan-Zeilen nach Universe
  const patchplanByUniverse = useMemo(() => {
    const grouped = new Map<number, PatchplanRow[]>();

    patchplan.forEach(row => {
      if (!grouped.has(row.universe)) {
        grouped.set(row.universe, []);
      }
      grouped.get(row.universe)!.push(row);
    });

    return grouped;
  }, [patchplan]);

  /**
   * Ändert die Start-Adresse eines Items
   * Berechnet automatisch alle betroffenen Adressen neu
   */
  const updateItemDMXAddress = useCallback(
    async (itemId: string, newStartAddress: number) => {
      const item = allItems.find(i => i.id === itemId);
      if (!item) {
        toast({
          title: 'Fehler',
          description: 'Item nicht gefunden',
          variant: 'destructive',
        });
        return;
      }

      if (!item.dmx_channels || newStartAddress < 1 || newStartAddress > 512) {
        toast({
          title: 'Fehler',
          description: 'Ungültige DMX-Adresse (1-512)',
          variant: 'destructive',
        });
        return;
      }

      const endAddress = newStartAddress + (item.dmx_channels * item.quantity) - 1;
      if (endAddress > 512) {
        toast({
          title: 'Fehler',
          description: `Device benötigt ${item.dmx_channels * item.quantity} Kanäle. Nicht genug Platz ab Adresse ${newStartAddress}`,
          variant: 'destructive',
        });
        return;
      }

      try {
        await updateItem(itemId, {
          ...item,
          dmx_start_address: newStartAddress,
        });

        toast({
          title: 'Erfolg',
          description: `DMX-Adresse aktualisiert: ${newStartAddress}-${endAddress}`,
        });
      } catch (error) {
        toast({
          title: 'Fehler',
          description: 'DMX-Adresse konnte nicht aktualisiert werden',
          variant: 'destructive',
        });
      }
    },
    [allItems, updateItem, toast]
  );

  /**
   * Ändert die Universe des Items
   */
  const updateItemDMXUniverse = useCallback(
    async (itemId: string, newUniverse: number) => {
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;

      try {
        await updateItem(itemId, {
          ...item,
          dmx_universe: newUniverse,
        });

        toast({
          title: 'Erfolg',
          description: `Universe aktualisiert: ${newUniverse}`,
        });
      } catch (error) {
        toast({
          title: 'Fehler',
          description: 'Universe konnte nicht aktualisiert werden',
          variant: 'destructive',
        });
      }
    },
    [allItems, updateItem, toast]
  );

  /**
   * Findet den nächsten verfügbaren Kanal in einem Universe
   * und aktualisiert das Item automatisch
   */
  const autoAssignNextAvailable = useCallback(
    async (itemId: string, universe: number = 1) => {
      const item = allItems.find(i => i.id === itemId);
      if (!item || !item.dmx_channels) {
        toast({
          title: 'Fehler',
          description: 'Item oder DMX-Kanäle nicht konfiguriert',
          variant: 'destructive',
        });
        return;
      }

      const currentUniversePatchplan = patchplan.filter(r => r.universe === universe);
      const nextChannel = findNextAvailableChannel(currentUniversePatchplan, universe);

      if (nextChannel === -1) {
        toast({
          title: 'Fehler',
          description: `Nicht genug Platz in Universe ${universe}`,
          variant: 'destructive',
        });
        return;
      }

      await updateItemDMXAddress(itemId, nextChannel);
    },
    [allItems, patchplan, updateItemDMXAddress, toast]
  );

  /**
   * Prüft ob ein Item Konflikte hat
   */
  const hasConflict = useCallback(
    (itemId: string): boolean => {
      return conflicts.some(c => c.row1.itemId === itemId || c.row2.itemId === itemId);
    },
    [conflicts]
  );

  /**
   * Gibt den Konflikt eines Items zurück (falls vorhanden)
   */
  const getConflictsForItem = useCallback(
    (itemId: string): DMXConflict[] => {
      return conflicts.filter(c => c.row1.itemId === itemId || c.row2.itemId === itemId);
    },
    [conflicts]
  );

  return {
    patchplan,
    conflicts,
    universeUsage,
    patchplanByUniverse,
    updateItemDMXAddress,
    updateItemDMXUniverse,
    autoAssignNextAvailable,
    hasConflict,
    getConflictsForItem,
  };
}
