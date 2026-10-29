import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { PatchplanRow } from "@/lib/dmxPatchplan";
import { cn } from "@/lib/utils";
import { DMX_UNIVERSE_SIZE, padAddress } from "@/components/dmx/dmxFormat";

/** Channels per grid line on desktop; mobile shows half (16). Visible range is a multiple of this. */
const LINE = 32;

interface PatchGridProps {
  rows: PatchplanRow[];
  /** Highest channel shown; rounded up to a full line. */
  visibleUntil: number;
  hoveredRowId?: string | null;
  selectedRow: PatchplanRow | null;
  onRowHover?: (row: PatchplanRow | null) => void;
  /** Click on a channel; `rows` are the instances patched there (empty = free). */
  onChannelClick: (channel: number, rows: PatchplanRow[]) => void;
}

/**
 * Console-style patch view: one cell per DMX channel, 32 per line (16 on
 * phones). Patched channels are filled, the first channel of each fixture
 * gets a start marker, overlapping channels are hatched red.
 */
export function PatchGrid({
  rows,
  visibleUntil,
  hoveredRowId,
  selectedRow,
  onRowHover,
  onChannelClick,
}: PatchGridProps) {
  const { t } = useTranslation();

  const occupancy = useMemo(() => {
    const map = new Map<number, PatchplanRow[]>();
    for (const row of rows) {
      for (let ch = row.startAddress; ch <= Math.min(row.endAddress, DMX_UNIVERSE_SIZE); ch++) {
        const list = map.get(ch);
        if (list) list.push(row);
        else map.set(ch, [row]);
      }
    }
    return map;
  }, [rows]);

  // Alternate two fill levels so directly adjacent fixtures stay distinguishable.
  const shade = useMemo(() => {
    const map = new Map<string, number>();
    [...rows].sort((a, b) => a.startAddress - b.startAddress).forEach((row, i) => map.set(row.id, i % 2));
    return map;
  }, [rows]);

  const limit = Math.min(DMX_UNIVERSE_SIZE, Math.ceil(visibleUntil / LINE) * LINE);
  const channels = Array.from({ length: limit }, (_, i) => i + 1);

  return (
    <div
      role="grid"
      aria-label={t("dmx_patchplan.title")}
      className="grid grid-cols-[repeat(16,minmax(0,1fr))] overflow-hidden rounded-md border-l border-t border-border lg:grid-cols-[repeat(32,minmax(0,1fr))]"
      onMouseLeave={() => onRowHover?.(null)}
    >
      {channels.map((ch) => {
        const here = occupancy.get(ch) ?? [];
        const primary = here[0];
        const isConflict = here.length > 1;
        const isStart = here.some((r) => r.startAddress === ch);
        const altShade = !!primary && shade.get(primary.id) === 1;
        const isSelected = !!selectedRow && here.some((r) => r.id === selectedRow.id);
        const isHovered = !!hoveredRowId && here.some((r) => r.id === hoveredRowId);
        const doesNotFit = !!selectedRow && here.length === 0 && ch + selectedRow.channels - 1 > DMX_UNIVERSE_SIZE;

        const label = primary
          ? here.map((r) => `${padAddress(r.startAddress)}–${padAddress(r.endAddress)} ${r.itemName}${r.totalInstances > 1 ? ` #${r.instanceNumber}` : ""}`).join(" · ")
          : doesNotFit
            ? t("dmx_timeline.no_room", { channels: selectedRow?.channels })
            : t("dmx_timeline.channel_free", { channel: ch });

        return (
          <button
            key={ch}
            type="button"
            role="gridcell"
            title={label}
            aria-label={label}
            disabled={doesNotFit}
            onMouseEnter={() => onRowHover?.(primary ?? null)}
            onFocus={() => onRowHover?.(primary ?? null)}
            onClick={() => onChannelClick(ch, here)}
            className={cn(
              "relative flex h-7 items-center justify-center border-b border-r border-border font-mono text-[10px] tabular-nums transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
              // Every 8th channel gets a slightly stronger divider for orientation
              ch % 8 === 0 && "border-r-border-strong",
              here.length === 0 && "text-muted-foreground/40 hover:bg-muted/60 hover:text-foreground",
              here.length > 0 && !altShade && "bg-foreground/[0.07] text-foreground/80 hover:bg-foreground/[0.12] dark:bg-foreground/[0.1]",
              here.length > 0 && altShade && "bg-foreground/[0.13] text-foreground/80 hover:bg-foreground/[0.18] dark:bg-foreground/[0.17]",
              isHovered && "bg-foreground/[0.2] text-foreground dark:bg-foreground/[0.25]",
              isSelected && "bg-primary/20 text-foreground hover:bg-primary/25 dark:bg-primary/20",
              isConflict &&
                "bg-destructive/15 text-destructive dark:bg-destructive/15 [background-image:repeating-linear-gradient(135deg,transparent_0_4px,hsl(var(--destructive)/0.18)_4px_6px)] hover:bg-destructive/20",
              doesNotFit && "cursor-not-allowed text-muted-foreground/25 hover:bg-transparent",
              selectedRow && here.length === 0 && !doesNotFit && "cursor-copy"
            )}
          >
            {isStart && (
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-0 left-0 w-[3px]",
                  isConflict ? "bg-destructive" : isSelected ? "bg-primary" : "bg-foreground/60"
                )}
              />
            )}
            <span className={cn(isStart && "font-semibold text-foreground", isConflict && "text-destructive")}>
              {ch}
            </span>
          </button>
        );
      })}
    </div>
  );
}
