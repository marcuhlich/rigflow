import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PatchplanRow } from "@/lib/dmxPatchplan";
import { cn } from "@/lib/utils";
import { DMX_UNIVERSE_SIZE, countPatchedChannels, padAddress } from "@/components/dmx/dmxFormat";
import { PatchGrid } from "@/components/dmx/PatchGrid";

interface TimelineUniverseProps {
  universe: number;
  rows: PatchplanRow[];
  /** Number of conflicting pairs in this universe (same count as the summary). */
  conflictCount: number;
  conflictIndex: Map<string, PatchplanRow[]>;
  hoveredRowId?: string | null;
  selectedRow: PatchplanRow | null;
  onRowHover?: (row: PatchplanRow | null) => void;
  onRowSelect: (row: PatchplanRow) => void;
  onChannelClick: (universe: number, channel: number, rows: PatchplanRow[]) => void;
}

/** One universe: header, channel grid, and the patch list. */
export function TimelineUniverse({
  universe,
  rows,
  conflictCount,
  conflictIndex,
  hoveredRowId,
  selectedRow,
  onRowHover,
  onRowSelect,
  onChannelClick,
}: TimelineUniverseProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const used = useMemo(() => countPatchedChannels(rows), [rows]);
  const lastUsed = useMemo(() => rows.reduce((max, r) => Math.max(max, r.endAddress), 0), [rows]);

  // Show the used range plus one free line, so there is always room to patch into.
  const visibleUntil = showAll ? DMX_UNIVERSE_SIZE : Math.min(DMX_UNIVERSE_SIZE, lastUsed + 32);
  const canToggle = lastUsed + 32 < DMX_UNIVERSE_SIZE;

  return (
    <section className="surface overflow-hidden">
      <header className="flex h-10 items-center gap-3 border-b border-border px-3 sm:px-4">
        <h3 className="text-[13px] font-semibold">{t("dmx.universe_number", { number: universe })}</h3>
        <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
          {used}/{DMX_UNIVERSE_SIZE}
        </span>
        <div className="ml-auto flex items-center gap-3 text-[12px] text-muted-foreground">
          {conflictCount > 0 && (
            <span className="font-medium text-destructive">{t("dmx.badge_conflicts", { count: conflictCount })}</span>
          )}
          <span className="hidden sm:inline">{t("dmx_timeline.device_count", { count: rows.length })}</span>
          {canToggle && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="font-medium text-foreground hover:underline"
            >
              {showAll ? t("dmx_timeline.show_used") : t("dmx_timeline.show_all")}
            </button>
          )}
        </div>
      </header>

      <div className="p-2 sm:p-3">
        <PatchGrid
          rows={rows}
          visibleUntil={visibleUntil}
          hoveredRowId={hoveredRowId}
          selectedRow={selectedRow?.universe === universe ? selectedRow : null}
          onRowHover={onRowHover}
          onChannelClick={(channel, here) => onChannelClick(universe, channel, here)}
        />
      </div>

      <ul className="grid grid-cols-1 gap-x-4 border-t border-border px-1.5 py-1.5 sm:grid-cols-2 sm:px-2.5 xl:grid-cols-3">
        {rows.map((row) => {
          const conflict = conflictIndex.has(row.id);
          const hovered = hoveredRowId === row.id;
          const selected = selectedRow?.id === row.id;
          return (
            <li key={row.id}>
              <button
                type="button"
                aria-pressed={selected}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[4px] px-1.5 py-1 text-left text-[12px] transition-colors hover:bg-muted/60",
                  hovered && "bg-muted/60",
                  selected && "bg-primary/15 hover:bg-primary/20",
                  conflict && "text-destructive"
                )}
                onMouseEnter={() => onRowHover?.(row)}
                onMouseLeave={() => onRowHover?.(null)}
                onFocus={() => onRowHover?.(row)}
                onBlur={() => onRowHover?.(null)}
                onClick={() => onRowSelect(row)}
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
