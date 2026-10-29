import { CSSProperties, MouseEvent, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { PatchplanRow } from "@/lib/dmxPatchplan";
import { cn } from "@/lib/utils";
import { DMX_UNIVERSE_SIZE, countPatchedChannels, padAddress } from "@/components/dmx/dmxFormat";
import { DMX_SCROLL_ATTR } from "@/components/dmx/usePinchZoom";
import { TimelineTrack } from "@/components/dmx/TimelineTrack";
import { addrToPct, assignLanes } from "@/components/dmx/timelineLayout";

/** Minimum track width on small screens so blocks stay readable (forces h-scroll). */
const MOBILE_MIN_WIDTH = 300;

interface TimelineUniverseProps {
  universe: number;
  rows: PatchplanRow[];
  marks: number[];
  zoom: number;
  compact: boolean;
  conflictIndex: Map<string, PatchplanRow[]>;
  hoveredRowId?: string | null;
  draggingId: string | null;
  previewAddr: number | null;
  canDrag: boolean;
  onRowHover?: (row: PatchplanRow | null) => void;
  onBlockClick: (row: PatchplanRow) => void;
  onDragStart: (e: MouseEvent, row: PatchplanRow, track: HTMLElement) => void;
}

/** One universe: header, address ruler, track, and a compact patch legend. */
export function TimelineUniverse({
  universe,
  rows,
  marks,
  zoom,
  compact,
  conflictIndex,
  hoveredRowId,
  draggingId,
  previewAddr,
  canDrag,
  onRowHover,
  onBlockClick,
  onDragStart,
}: TimelineUniverseProps) {
  const { t } = useTranslation();
  const { lanes, laneCount } = useMemo(() => assignLanes(rows), [rows]);
  const used = useMemo(() => countPatchedChannels(rows), [rows]);
  const conflicts = rows.filter((r) => conflictIndex.has(r.id)).length;

  const innerStyle: CSSProperties | undefined = compact
    ? { minWidth: MOBILE_MIN_WIDTH, width: zoom > 1.05 ? `${zoom * 100}%` : undefined }
    : undefined;

  return (
    <section className="surface overflow-hidden">
      <header className="flex h-10 items-center gap-3 border-b border-border px-3 sm:px-4">
        <h3 className="text-[13px] font-semibold">{t("dmx.universe_number", { number: universe })}</h3>
        <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
          {used}/{DMX_UNIVERSE_SIZE}
        </span>
        <div className="ml-auto flex items-center gap-3 text-[12px] text-muted-foreground">
          {conflicts > 0 && (
            <span className="font-medium text-destructive">{t("dmx.badge_conflicts", { count: conflicts })}</span>
          )}
          <span>{t("dmx_timeline.device_count", { count: rows.length })}</span>
        </div>
      </header>

      <div {...{ [DMX_SCROLL_ATTR]: "" }} className="overflow-x-auto px-2 pb-2 pt-2 sm:px-4 sm:pb-3">
        <div className="relative" style={innerStyle}>
          <div className="relative mb-1 h-4" aria-hidden>
            {marks.map((m) => (
              <span
                key={m}
                className={cn(
                  "absolute font-mono text-[10px] tabular-nums text-muted-foreground",
                  m === 1 ? "translate-x-0" : "-translate-x-1/2"
                )}
                style={{ left: `${addrToPct(m)}%` }}
              >
                {padAddress(m)}
              </span>
            ))}
            <span className="absolute right-0 font-mono text-[10px] tabular-nums text-muted-foreground">
              {DMX_UNIVERSE_SIZE}
            </span>
          </div>
          <TimelineTrack
            rows={rows}
            lanes={lanes}
            laneCount={laneCount}
            marks={marks}
            conflictIndex={conflictIndex}
            hoveredRowId={hoveredRowId}
            draggingId={draggingId}
            previewAddr={previewAddr}
            canDrag={canDrag}
            onRowHover={onRowHover}
            onBlockClick={onBlockClick}
            onDragStart={onDragStart}
          />
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-x-4 border-t border-border px-1.5 py-1.5 sm:grid-cols-2 sm:px-2.5 xl:grid-cols-3">
        {rows.map((row) => {
          const conflict = conflictIndex.has(row.id);
          const hovered = hoveredRowId === row.id;
          return (
            <li key={row.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-[4px] px-1.5 py-1 text-left text-[12px] transition-colors hover:bg-muted/60",
                  hovered && "bg-muted/60",
                  conflict && "text-destructive"
                )}
                onMouseEnter={() => onRowHover?.(row)}
                onMouseLeave={() => onRowHover?.(null)}
                onFocus={() => onRowHover?.(row)}
                onBlur={() => onRowHover?.(null)}
                onClick={() => onBlockClick(row)}
              >
                <span className="shrink-0 font-mono tabular-nums">
                  {padAddress(row.startAddress)}–{padAddress(row.endAddress)}
                </span>
                <span className="min-w-0 truncate">{row.itemName}</span>
                {row.totalInstances > 1 && (
                  <span className="shrink-0 font-mono text-muted-foreground">#{row.instanceNumber}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
