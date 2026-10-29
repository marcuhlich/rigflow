import type { DMXConflict, PatchplanRow } from "@/lib/dmxPatchplan";

export const DMX_UNIVERSE_SIZE = 512;

/** 3-digit console style address: 1 → "001". */
export function padAddress(addr: number): string {
  return String(addr).padStart(3, "0");
}

/** Console style "universe.address", e.g. 1.001 */
export function formatPatch(universe: number, addr: number): string {
  return `${universe}.${padAddress(addr)}`;
}

/**
 * Maps each row id to the rows it overlaps with. Conflicts are per instance
 * (row id), not per item, so only the instances that actually collide are flagged.
 */
export function buildConflictIndex(conflicts: DMXConflict[]): Map<string, PatchplanRow[]> {
  const index = new Map<string, PatchplanRow[]>();
  const add = (a: PatchplanRow, b: PatchplanRow) => {
    const list = index.get(a.id);
    if (list) list.push(b);
    else index.set(a.id, [b]);
  };
  for (const c of conflicts) {
    add(c.row1, c.row2);
    add(c.row2, c.row1);
  }
  return index;
}

/** Groups rows by universe, ascending universe, rows sorted by start address. */
export function groupByUniverse(rows: PatchplanRow[]): [number, PatchplanRow[]][] {
  const groups = new Map<number, PatchplanRow[]>();
  for (const row of rows) {
    const list = groups.get(row.universe);
    if (list) list.push(row);
    else groups.set(row.universe, [row]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([u, list]) => [u, [...list].sort((a, b) => a.startAddress - b.startAddress)]);
}

/** Sum of patched channels (footprints) in a universe; overlapping channels counted once. */
export function countPatchedChannels(rows: PatchplanRow[]): number {
  const used = new Set<number>();
  for (const r of rows) {
    for (let ch = r.startAddress; ch <= r.endAddress; ch++) used.add(ch);
  }
  return used.size;
}
