import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, X } from "lucide-react";
import type { DMXConflict, PatchplanRow } from "@/lib/dmxPatchplan";
import { Button } from "@/components/ui/button";
import { EmptyPanel } from "@/components/QueryState";
import { DMXAddressDialog } from "@/components/dmx/DMXAddressDialog";
import { TimelineUniverse } from "@/components/dmx/TimelineUniverse";
import { DMX_UNIVERSE_SIZE, buildConflictIndex, groupByUniverse, padAddress } from "@/components/dmx/dmxFormat";

interface DMXTimelineProps {
  rows: PatchplanRow[];
  conflicts: DMXConflict[];
  /** Called on fixture click when the view is read-only (no onInstanceChange). */
  onRowClick?: (row: PatchplanRow) => void;
  onRowHover?: (row: PatchplanRow | null) => void;
  hoveredRowId?: string | null;
  onInstanceChange?: (itemId: string, instanceNumber: number, newAddress: number, newUniverse: number) => Promise<void>;
  onResetInstance?: (itemId: string, instanceNumber: number) => Promise<void>;
}

/**
 * Patch overview per universe as a channel grid (like a lighting console).
 * Select a fixture (grid or list), then click a free channel to re-patch it,
 * or open the address dialog for exact values / another universe.
 */
export function DMXTimeline({
  rows,
  conflicts,
  onRowClick,
  onRowHover,
  hoveredRowId,
  onInstanceChange,
  onResetInstance,
}: DMXTimelineProps) {
  const { t } = useTranslation();
  const editable = !!onInstanceChange;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<PatchplanRow | null>(null);
  const [moving, setMoving] = useState(false);

  const groups = useMemo(() => groupByUniverse(rows), [rows]);
  const conflictIndex = useMemo(() => buildConflictIndex(conflicts), [conflicts]);
  // Re-resolve by id so the selection follows the row after a re-patch refetch.
  const selectedRow = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const selectRow = useCallback(
    (row: PatchplanRow) => {
      if (!editable) {
        onRowClick?.(row);
        return;
      }
      setSelectedId((current) => (current === row.id ? null : row.id));
    },
    [editable, onRowClick]
  );

  const handleChannelClick = useCallback(
    async (universe: number, channel: number, here: PatchplanRow[]) => {
      if (here.length > 0) {
        // Clicking a patched channel selects (or toggles) the fixture there.
        selectRow(here[0]);
        return;
      }
      if (!selectedRow || !onInstanceChange || moving) return;
      if (channel + selectedRow.channels - 1 > DMX_UNIVERSE_SIZE) return;
      setMoving(true);
      try {
        await onInstanceChange(selectedRow.itemId, selectedRow.instanceNumber, channel, universe);
      } finally {
        setMoving(false);
      }
    },
    [selectRow, selectedRow, onInstanceChange, moving]
  );

  return (
    <div className="w-full space-y-3">
      {rows.length === 0 && <EmptyPanel title={t("dmx_timeline.empty")} />}

      {selectedRow && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-primary/40 bg-card px-3 py-2 text-[13px] shadow-sm">
          <span className="font-mono tabular-nums text-muted-foreground">
            {selectedRow.universe}.{padAddress(selectedRow.startAddress)}
          </span>
          <span className="font-medium">
            {selectedRow.itemName}
            {selectedRow.totalInstances > 1 && <span className="ml-1 font-mono text-muted-foreground">#{selectedRow.instanceNumber}</span>}
          </span>
          <span className="text-muted-foreground">{t("dmx_timeline.select_hint", { name: selectedRow.itemName })}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setEditingRow(selectedRow)}>
              <Pencil />
              {t("dmx_timeline.edit_address")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)} aria-label={t("dmx_timeline.deselect")}>
              <X />
            </Button>
          </div>
        </div>
      )}

      {groups.map(([universe, universeRows]) => (
        <TimelineUniverse
          key={universe}
          universe={universe}
          rows={universeRows}
          conflictCount={conflicts.filter((c) => c.universe === universe).length}
          conflictIndex={conflictIndex}
          hoveredRowId={hoveredRowId}
          selectedRow={selectedRow}
          onRowHover={onRowHover}
          onRowSelect={selectRow}
          onChannelClick={(u, ch, here) => void handleChannelClick(u, ch, here)}
        />
      ))}

      <DMXAddressDialog
        row={editingRow}
        conflictsWith={editingRow ? conflictIndex.get(editingRow.id) : undefined}
        onClose={() => setEditingRow(null)}
        onSave={async (row, address, universe) => {
          await onInstanceChange?.(row.itemId, row.instanceNumber, address, universe);
        }}
        onReset={onResetInstance ? (row) => onResetInstance(row.itemId, row.instanceNumber) : undefined}
      />
    </div>
  );
}
