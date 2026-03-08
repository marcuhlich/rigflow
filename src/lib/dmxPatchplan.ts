import { InventoryItem } from '@/types/inventory';

export interface PatchedInstance {
  instanceNumber: number;
  startAddress: number;
  endAddress: number;
  channels: number;
}

export interface PatchplanRow {
  id: string;
  itemId: string;
  itemName: string;
  instanceNumber: number;
  totalInstances: number;
  universe: number;
  startAddress: number;
  endAddress: number;
  channels: number;
  condition: string;
  location: string;
  /** Whether this instance has a custom (per-instance) config */
  hasCustomConfig: boolean;
}

export interface DMXConflict {
  row1: PatchplanRow;
  row2: PatchplanRow;
  universe: number;
}

/** Per-instance DMX config from the database */
export interface DMXInstanceConfig {
  id: string;
  item_id: string;
  instance_number: number;
  dmx_start_address: number;
  dmx_universe: number;
}

/**
 * Generates a patchplan using per-instance configs when available,
 * falling back to consecutive addresses from the item's base config.
 */
export function generatePatchplan(
  items: InventoryItem[],
  instanceConfigs: DMXInstanceConfig[] = []
): PatchplanRow[] {
  const dmxItems = items.filter(
    item => item.dmx_start_address && item.dmx_channels
  );

  // Index instance configs by item_id
  const configsByItem = new Map<string, Map<number, DMXInstanceConfig>>();
  instanceConfigs.forEach(cfg => {
    if (!configsByItem.has(cfg.item_id)) configsByItem.set(cfg.item_id, new Map());
    configsByItem.get(cfg.item_id)!.set(cfg.instance_number, cfg);
  });

  const rows: PatchplanRow[] = [];

  dmxItems.forEach(item => {
    const baseUniverse = item.dmx_universe || 1;
    const baseStartAddress = item.dmx_start_address || 1;
    const channels = item.dmx_channels!;
    const itemConfigs = configsByItem.get(item.id);

    for (let i = 1; i <= item.quantity; i++) {
      const instanceCfg = itemConfigs?.get(i);

      let startAddr: number;
      let universe: number;
      let hasCustom: boolean;

      if (instanceCfg) {
        // Use individual config
        startAddr = instanceCfg.dmx_start_address;
        universe = instanceCfg.dmx_universe;
        hasCustom = true;
      } else {
        // Fallback: consecutive from base address
        startAddr = baseStartAddress + (i - 1) * channels;
        universe = baseUniverse;
        hasCustom = false;
      }

      const endAddr = startAddr + channels - 1;
      if (endAddr > 512) continue; // Skip if out of range

      rows.push({
        id: `${item.id}-${i}`,
        itemId: item.id,
        itemName: item.name,
        instanceNumber: i,
        totalInstances: item.quantity,
        universe,
        startAddress: startAddr,
        endAddress: endAddr,
        channels,
        condition: item.condition,
        location: item.location,
        hasCustomConfig: hasCustom,
      });
    }
  });

  rows.sort((a, b) => {
    if (a.universe !== b.universe) return a.universe - b.universe;
    return a.startAddress - b.startAddress;
  });

  return rows;
}

export function findConflicts(rows: PatchplanRow[]): DMXConflict[] {
  const conflicts: DMXConflict[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const row1 = rows[i];
      const row2 = rows[j];
      if (row1.universe !== row2.universe) continue;
      if (row1.startAddress <= row2.endAddress && row2.startAddress <= row1.endAddress) {
        conflicts.push({ row1, row2, universe: row1.universe });
      }
    }
  }
  return conflicts;
}

export function calculateUniverseUsage(rows: PatchplanRow[]): Record<number, number> {
  const usage: Record<number, number> = {};
  rows.forEach(row => {
    if (!usage[row.universe]) usage[row.universe] = 0;
    usage[row.universe] = Math.max(usage[row.universe], row.endAddress);
  });
  return usage;
}

export function findNextAvailableChannel(
  rows: PatchplanRow[],
  universe: number,
  channelsNeeded: number = 1,
  startSearchFrom: number = 1
): number {
  const usedRanges = rows
    .filter(r => r.universe === universe)
    .map(r => ({ start: r.startAddress, end: r.endAddress }))
    .sort((a, b) => a.start - b.start);

  for (let ch = startSearchFrom; ch <= 512 - channelsNeeded + 1; ch++) {
    const endCh = ch + channelsNeeded - 1;
    const overlaps = usedRanges.some(r => ch <= r.end && endCh >= r.start);
    if (!overlaps) return ch;
  }
  return -1;
}

export function exportPatchplanAsCSV(rows: PatchplanRow[]): string {
  const headers = ['Universe', 'Item Name', 'Instance', 'Start Address', 'End Address', 'Channels', 'Condition', 'Location'];
  const csv = [headers.join(',')];
  rows.forEach(row => {
    csv.push([row.universe, `"${row.itemName}"`, row.instanceNumber, row.startAddress, row.endAddress, row.channels, row.condition, `"${row.location}"`].join(','));
  });
  return csv.join('\n');
}
