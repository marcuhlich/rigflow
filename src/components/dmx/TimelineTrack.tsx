import { KeyboardEvent, MouseEvent, useRef } from "react";
import { AlertTriangle, GripVertical } from "lucide-react";
import type { PatchplanRow } from "@/lib/dmxPatchplan";
import { cn } from "@/lib/utils";
import { padAddress } from "@/components/dmx/dmxFormat";
import {
  LANE_GAP,
  LANE_HEIGHT,
  LANE_PAD,
  addrToPct,
  channelsToPct,
  trackHeight,
} from "@/components/dmx/timelineLayout";

interface TimelineTrackProps {
  rows: PatchplanRow[];
  lanes: Map<string, number>;
  laneCount: number;
  marks: number[];
  conflictIndex: Map<string, PatchplanRow[]>;
  hoveredRowId?: string | null;
  draggingId: string | null;
  previewAddr: number | null;
  canDrag: boolean;
  onRowHover?: (row: PatchplanRow | null) => void;
  onBlockClick: (row: PatchplanRow) => void;
  onDragStart: (e: MouseEvent, row: PatchplanRow, track: HTMLElement) => void;
}

/** The 512-channel track with one block per fixture instance. */
export function TimelineTrack({
  rows,
  lanes,
  laneCount,
  marks,
  conflictIndex,
  hoveredRowId,
  draggingId,
  previewAddr,
  canDrag,
  onRowHover,
  onBlockClick,
  onDragStart,
}: TimelineTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const hoveredPartners = hoveredRowId ? conflictIndex.get(hoveredRowId) ?? [] : [];

  return (
    <div
      ref={trackRef}
      className="relative w-full rounded-md border border-border bg-surface-sunken"
      style={{ height: trackHeight(laneCount) }}
    >
      {marks.map((m) => (
        <div
          key={m}
          aria-hidden
          className="absolute top-0 h-full border-l border-border/70"
          style={{ left: `${addrToPct(m)}%` }}
        />
      ))}

      {draggingId && previewAddr !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 z-30 h-full border-l border-primary"
          style={{ left: `${addrToPct(previewAddr)}%` }}
        />
      )}

      {rows.map((row) => {
        const lane = lanes.get(row.id) ?? 0;
        const dragging = draggingId === row.id;
        const addr = dragging && previewAddr !== null ? previewAddr : row.startAddress;
        const end = addr + row.channels - 1;
        const widthPct = channelsToPct(row.channels);
        const conflict = conflictIndex.has(row.id);
        const hovered = hoveredRowId === row.id;
        const related = hoveredPartners.some((p) => p.id === row.id);
        const dimmed = !!hoveredRowId && !hovered && !related && !dragging;
        const label = `${row.itemName}${row.totalInstances > 1 ? ` #${row.instanceNumber}` : ""} · ${row.universe}.${padAddress(addr)}–${padAddress(end)}`;

        const handleKey = (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onBlockClick(row);
          }
        };

        return (
          <div
            key={row.id}
            role="button"
            tabIndex={0}
            aria-label={label}
            title={label}
            className={cn(
              "group absolute flex select-none items-center overflow-hidden rounded-[4px] border text-left transition-[opacity,border-color,background-color] duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              conflict
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border-strong bg-card text-foreground",
              hovered && !conflict && "border-foreground",
              related && "border-warning bg-warning/10",
              dragging ? "z-30 cursor-grabbing border-primary bg-primary/10" : "cursor-pointer",
              hovered && "z-20",
              dimmed && "opacity-40"
            )}
            style={{
              left: `${addrToPct(addr)}%`,
              width: `max(${widthPct}%, 28px)`,
              top: LANE_PAD + lane * (LANE_HEIGHT + LANE_GAP),
              height: LANE_HEIGHT,
            }}
            onMouseEnter={() => !draggingId && onRowHover?.(row)}
            onMouseLeave={() => !draggingId && onRowHover?.(null)}
            onClick={() => !dragging && onBlockClick(row)}
            onKeyDown={handleKey}
          >
            {canDrag && (
              <span
                aria-hidden
                className="hidden h-full w-3.5 shrink-0 cursor-grab items-center justify-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 lg:flex"
                onMouseDown={(e) => trackRef.current && onDragStart(e, row, trackRef.current)}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-3 w-3" />
              </span>
            )}
            <span className="pointer-events-none flex min-w-0 flex-1 items-center gap-1 px-1.5">
              {conflict && <AlertTriangle className="h-3 w-3 shrink-0" />}
              {widthPct > 5 && (
                <span className="truncate text-[11px] font-medium leading-none">{row.itemName}</span>
              )}
              {row.totalInstances > 1 && widthPct > 10 && (
                <span className="shrink-0 font-mono text-[10px] leading-none text-muted-foreground">
                  #{row.instanceNumber}
                </span>
              )}
              <span className="ml-auto shrink-0 font-mono text-[10px] leading-none tabular-nums opacity-80">
                {padAddress(addr)}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
