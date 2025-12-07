import { InventoryItem } from '@/types/inventory';

/**
 * Repräsentiert ein einzelnes gepatchtes Gerät mit berechneten Adressen
 */
export interface PatchedDevice {
  itemId: string;
  itemName: string;
  quantity: number;
  dmxChannels: number;
  universe: number;
  instances: PatchedInstance[];
  condition: string;
  location: string;
}

/**
 * Repräsentiert eine einzelne Instanz eines gepatchten Geräts
 * (z.B. die 2. von 4 LED-Bars)
 */
export interface PatchedInstance {
  instanceNumber: number;
  startAddress: number;
  endAddress: number;
  channels: number;
}

/**
 * Repräsentiert die Patchplan-Zeile wie sie angezeigt wird
 */
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
}

/**
 * Repräsentiert Adresskonflikte
 */
export interface DMXConflict {
  row1: PatchplanRow;
  row2: PatchplanRow;
  universe: number;
}

/**
 * Berechnet automatisch DMX-Adressen für alle Instanzen eines Items
 * Berücksichtigt die Menge und ordnet Instanzen hintereinander
 */
export function calculateInstanceAddresses(
  item: InventoryItem,
  startingAddress: number,
  universe: number
): PatchedInstance[] {
  const MAX_DMX_ADDRESS = 512;
  
  if (!item.dmx_channels || !item.dmx_start_address) {
    return [];
  }

  const instances: PatchedInstance[] = [];
  const channelsPerInstance = item.dmx_channels;
  let currentAddress = startingAddress;

  for (let i = 1; i <= item.quantity; i++) {
    const startAddr = currentAddress;
    const endAddr = startAddr + channelsPerInstance - 1;

    // ✅ WICHTIG: Prüfe dass ALLES in Range ist
    if (endAddr > MAX_DMX_ADDRESS) {
      console.warn(
        `Device "${item.name}" Instanz ${i} in Universe ${universe} überschreitet DMX-Limit. ` +
        `Benötigt: ${channelsPerInstance} Kanäle ab ${startAddr}, aber nur ${MAX_DMX_ADDRESS - startAddr + 1} verfügbar.`
      );
      break; // ✅ Abbrechen wenn nicht genug Platz
    }

    instances.push({
      instanceNumber: i,
      startAddress: startAddr,
      endAddress: endAddr,
      channels: channelsPerInstance, // ✅ Konsistent mit Adressen!
    });

    currentAddress = endAddr + 1; // ✅ Zur nächsten verfügbaren Adresse
  }

  return instances;
}

/**
 * Erstellt einen kompletten Patchplan aus allen Items
 * Sortiert nach Universe und Start-Adresse
 */
export function generatePatchplan(items: InventoryItem[]): PatchplanRow[] {
  const dmxItems = items.filter(
    item => item.dmx_start_address && item.dmx_channels
  );

  const rows: PatchplanRow[] = [];
  let rowId = 0;

  dmxItems.forEach(item => {
    const universe = item.dmx_universe || 1;
    const startAddress = item.dmx_start_address || 1;

    const instances = calculateInstanceAddresses(item, startAddress, universe);

    instances.forEach(instance => {
      rows.push({
        id: `${item.id}-${instance.instanceNumber}`,
        itemId: item.id,
        itemName: item.name,
        instanceNumber: instance.instanceNumber,
        totalInstances: item.quantity,
        universe,
        startAddress: instance.startAddress,
        endAddress: instance.endAddress,
        channels: instance.channels,
        condition: item.condition,
        location: item.location,
      });
      rowId++;
    });
  });

  // Sortiere nach Universe und dann nach Start-Adresse
  rows.sort((a, b) => {
    if (a.universe !== b.universe) {
      return a.universe - b.universe;
    }
    return a.startAddress - b.startAddress;
  });

  return rows;
}

/**
 * Findet alle Adresskonflikte im Patchplan
 */
export function findConflicts(rows: PatchplanRow[]): DMXConflict[] {
  const conflicts: DMXConflict[] = [];

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const row1 = rows[i];
      const row2 = rows[j];

      // Nur in gleichem Universe prüfen
      if (row1.universe !== row2.universe) {
        continue;
      }

      // Prüfe auf Überschneidung
      if (row1.startAddress <= row2.endAddress && row2.startAddress <= row1.endAddress) {
        conflicts.push({
          row1,
          row2,
          universe: row1.universe,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Berechnet die Gesamt-DMX-Auslastung pro Universe
 */
export function calculateUniverseUsage(rows: PatchplanRow[]): Record<number, number> {
  const usage: Record<number, number> = {};

  rows.forEach(row => {
    if (!usage[row.universe]) {
      usage[row.universe] = 0;
    }
    usage[row.universe] = Math.max(usage[row.universe], row.endAddress);
  });

  return usage;
}

/**
 * Findet den nächsten verfügbaren Kanal in einem Universe
 * (für Auto-Patching)
 */
export function findNextAvailableChannel(
  rows: PatchplanRow[],
  universe: number,
  startSearchFrom: number = 1
): number {
  const usedChannels = rows
    .filter(r => r.universe === universe)
    .flatMap(r => {
      const channels = [];
      for (let ch = r.startAddress; ch <= r.endAddress; ch++) {
        channels.push(ch);
      }
      return channels;
    });

  for (let ch = startSearchFrom; ch <= 512; ch++) {
    if (!usedChannels.includes(ch)) {
      return ch;
    }
  }

  return -1; // Kein Platz verfügbar
}

/**
 * Versucht, automatisch einen neuen Patchplan zu erstellen
 * wenn die aktuellen Adressen Konflikte haben
 */
export function autoResolveConflicts(items: InventoryItem[]): Map<string, number> {
  const addressMap = new Map<string, number>();
  const dmxItems = items.filter(
    item => item.dmx_start_address && item.dmx_channels
  );

  // Gruppiere nach Universe
  const byUniverse: Record<number, InventoryItem[]> = {};
  dmxItems.forEach(item => {
    const u = item.dmx_universe || 1;
    if (!byUniverse[u]) byUniverse[u] = [];
    byUniverse[u].push(item);
  });

  // Für jedes Universe separate Pläne erstellen
  Object.entries(byUniverse).forEach(([univStr, universeItems]) => {
    const universe = parseInt(univStr);
    let nextAddress = 1;

    // Sortiere nach ursprünglicher Start-Adresse
    universeItems.sort((a, b) => (a.dmx_start_address || 0) - (b.dmx_start_address || 0));

    universeItems.forEach(item => {
      const totalChannels = (item.dmx_channels || 0) * item.quantity;

      if (nextAddress + totalChannels - 1 > 512) {
        console.warn(
          `Cannot fit ${item.name} (${totalChannels} channels) in universe ${universe}`
        );
        return;
      }

      addressMap.set(item.id, nextAddress);
      nextAddress += totalChannels;
    });
  });

  return addressMap;
}

/**
 * Generiert einen visuellen String für die Timeline
 */
export function generateTimelineVisualization(
  rows: PatchplanRow[],
  barWidth: number = 100
): string[] {
  const universeGroups = new Map<number, PatchplanRow[]>();

  rows.forEach(row => {
    if (!universeGroups.has(row.universe)) {
      universeGroups.set(row.universe, []);
    }
    universeGroups.get(row.universe)!.push(row);
  });

  const lines: string[] = [];

  Array.from(universeGroups.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([universe, universeRows]) => {
      lines.push(`\n=== Universe ${universe} ===`);

      universeRows.forEach(row => {
        const start = row.startAddress - 1;
        const end = row.endAddress - 1;
        const totalChannels = 512;

        const leftPad = Math.round((start / totalChannels) * barWidth);
        const blockWidth = Math.round(((end - start + 1) / totalChannels) * barWidth);

        const bar = ' '.repeat(leftPad) + '█'.repeat(Math.max(blockWidth, 1)) + ' '.repeat(barWidth - leftPad - blockWidth);
        const label = `${row.itemName} #${row.instanceNumber}`;
        const info = `${row.startAddress}-${row.endAddress} (${row.channels}ch)`;

        lines.push(`[${bar}] ${label.padEnd(30)} ${info}`);
      });
    });

  return lines;
}

/**
 * Exportiert den Patchplan als CSV
 */
export function exportPatchplanAsCSV(rows: PatchplanRow[]): string {
  const headers = [
    'Universe',
    'Item Name',
    'Instance',
    'Start Address',
    'End Address',
    'Channels',
    'Condition',
    'Location',
  ];

  const csv = [headers.join(',')];

  rows.forEach(row => {
    const cols = [
      row.universe,
      `"${row.itemName}"`,
      row.instanceNumber,
      row.startAddress,
      row.endAddress,
      row.channels,
      row.condition,
      `"${row.location}"`,
    ];
    csv.push(cols.join(','));
  });

  return csv.join('\n');
}
