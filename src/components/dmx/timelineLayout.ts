import type { PatchplanRow } from "@/lib/dmxPatchplan";
import { DMX_UNIVERSE_SIZE } from "@/components/dmx/dmxFormat";

export const LANE_HEIGHT = 30;
export const LANE_GAP = 3;
export const LANE_PAD = 4;

/** Minimum rendered block width in % (blocks below this get a min pixel width too). */
const MIN_BLOCK_PCT = 4.7;

/** Left offset of a DMX address on the 512-channel track, in %. */
export function addrToPct(addr: number): number {
  return ((addr - 1) / DMX_UNIVERSE_SIZE) * 100;
}

/** Width of a footprint on the track, in %. */
export function channelsToPct(channels: number): number {
  return (channels / DMX_UNIVERSE_SIZE) * 100;
}

/** Assign rows to visual lanes so blocks never visually overlap. */
export function assignLanes(rows: PatchplanRow[]): { lanes: Map<string, number>; laneCount: number } {
  const sorted = [...rows].sort((a, b) => a.startAddress - b.startAddress);
  const lanes = new Map<string, number>();
  const laneEnds: number[] = [];

  for (const row of sorted) {
    const left = addrToPct(row.startAddress);
    const right = left + Math.max(channelsToPct(row.channels), MIN_BLOCK_PCT);
    let lane = laneEnds.findIndex((end) => end <= left - 0.3);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(right);
    } else {
      laneEnds[lane] = right;
    }
    lanes.set(row.id, lane);
  }
  return { lanes, laneCount: Math.max(laneEnds.length, 1) };
}

export function trackHeight(laneCount: number): number {
  return laneCount * (LANE_HEIGHT + LANE_GAP) - LANE_GAP + LANE_PAD * 2;
}

/** Ruler step, denser when zoomed in. */
export function rulerStep(zoom: number): number {
  if (zoom >= 6) return 16;
  if (zoom >= 4) return 32;
  if (zoom >= 2) return 64;
  return 128;
}

export function rulerMarks(step: number): number[] {
  const marks: number[] = [];
  for (let i = 1; i <= DMX_UNIVERSE_SIZE; i += step) marks.push(i);
  return marks;
}
