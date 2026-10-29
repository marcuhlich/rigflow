import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ZoomIn } from "lucide-react";
import type { DMXConflict, PatchplanRow } from "@/lib/dmxPatchplan";
import { useIsMobile } from "@/hooks/use-mobile";
import { EmptyPanel } from "@/components/QueryState";
import { DMXAddressDialog } from "@/components/dmx/DMXAddressDialog";
import { TimelineUniverse } from "@/components/dmx/TimelineUniverse";
import { buildConflictIndex, groupByUniverse } from "@/components/dmx/dmxFormat";
import { rulerMarks, rulerStep } from "@/components/dmx/timelineLayout";
import { useBlockDrag } from "@/components/dmx/useBlockDrag";
import { usePinchZoom } from "@/components/dmx/usePinchZoom";

interface DMXTimelineProps {
  rows: PatchplanRow[];
  conflicts: DMXConflict[];
  /** Called on block click when the timeline is read-only (no onInstanceChange). */
  onRowClick?: (row: PatchplanRow) => void;
  onRowHover?: (row: PatchplanRow | null) => void;
  hoveredRowId?: string | null;
  onInstanceChange?: (itemId: string, instanceNumber: number, newAddress: number, newUniverse: number) => Promise<void>;
  onResetInstance?: (itemId: string, instanceNumber: number) => Promise<void>;
}

/**
 * Patch overview per universe: each fixture instance is a block on a
 * 512-channel track. Click a block to edit, drag (desktop) to re-patch,
 * pinch to zoom (mobile).
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
  const isMobile = useIsMobile();
  const [editingRow, setEditingRow] = useState<PatchplanRow | null>(null);

  const { wrapperRef, zoom, resetZoom } = usePinchZoom(isMobile);

  const commitDrag = useCallback(
    (row: PatchplanRow, newAddress: number) =>
      onInstanceChange ? onInstanceChange(row.itemId, row.instanceNumber, newAddress, row.universe) : Promise.resolve(),
    [onInstanceChange]
  );
  const { draggingId, previewAddr, startDrag, canDrag } = useBlockDrag(
    onInstanceChange && !isMobile ? commitDrag : undefined
  );

  const groups = useMemo(() => groupByUniverse(rows), [rows]);
  const conflictIndex = useMemo(() => buildConflictIndex(conflicts), [conflicts]);
  const marks = useMemo(() => rulerMarks(rulerStep(zoom)), [zoom]);

  const handleBlockClick = useCallback(
    (row: PatchplanRow) => {
      if (onInstanceChange) setEditingRow(row);
      else onRowClick?.(row);
    },
    [onInstanceChange, onRowClick]
  );

  // The wrapper is always rendered so the pinch listeners stay attached.
  return (
    <div ref={wrapperRef} className="w-full space-y-3 overflow-x-hidden">
      {rows.length === 0 && <EmptyPanel title={t("dmx_timeline.empty")} />}

      {isMobile && rows.length > 0 && (
        <div className="flex h-6 select-none items-center justify-between text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ZoomIn className="h-3.5 w-3.5" />
            {t("dmx_timeline.zoom_hint")}
          </span>
          {zoom > 1.05 && (
            <button type="button" className="font-medium text-foreground" onClick={resetZoom}>
              {t("dmx_timeline.zoom_reset", { scale: Math.round(zoom * 10) / 10 })}
            </button>
          )}
        </div>
      )}

      {groups.map(([universe, universeRows]) => (
        <TimelineUniverse
          key={universe}
          universe={universe}
          rows={universeRows}
          marks={marks}
          zoom={zoom}
          compact={isMobile}
          conflictIndex={conflictIndex}
          hoveredRowId={hoveredRowId}
          draggingId={draggingId}
          previewAddr={previewAddr}
          canDrag={canDrag}
          onRowHover={onRowHover}
          onBlockClick={handleBlockClick}
          onDragStart={startDrag}
        />
      ))}

      <DMXAddressDialog
        row={editingRow}
        conflictsWith={editingRow ? conflictIndex.get(editingRow.id) : undefined}
        onClose={() => setEditingRow(null)}
        onSave={async (row, address, universe) => {
          await onInstanceChange?.(row.itemId, row.instanceNumber, address, universe);
        }}
        onReset={
          onResetInstance ? (row) => onResetInstance(row.itemId, row.instanceNumber) : undefined
        }
      />
    </div>
  );
}
