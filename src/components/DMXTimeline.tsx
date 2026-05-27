import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PatchplanRow, DMXConflict } from '@/lib/dmxPatchplan';
import { cn } from '@/lib/utils';
import { AlertTriangle, GripHorizontal, Pencil, ZoomIn } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';

interface DMXTimelineProps {
  rows: PatchplanRow[];
  conflicts: DMXConflict[];
  onRowClick?: (row: PatchplanRow) => void;
  onRowHover?: (row: PatchplanRow | null) => void;
  hoveredRowId?: string | null;
  onInstanceChange?: (itemId: string, instanceNumber: number, newAddress: number, newUniverse: number) => Promise<void>;
  onResetInstance?: (itemId: string, instanceNumber: number) => Promise<void>;
}

// Assign rows to visual lanes so blocks never visually overlap
function assignLanes(rows: PatchplanRow[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => a.startAddress - b.startAddress);
  const lanes = new Map<string, number>();
  const laneEnds: number[] = [];

  for (const row of sorted) {
    const leftPct = ((row.startAddress - 1) / 512) * 100;
    let assigned = -1;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= leftPct - 0.3) {
        assigned = i;
        break;
      }
    }
    const widthPct = Math.max(((row.endAddress - row.startAddress + 1) / 512) * 100, 4.7);
    const rightPct = leftPct + widthPct;

    if (assigned === -1) {
      assigned = laneEnds.length;
      laneEnds.push(rightPct);
    } else {
      laneEnds[assigned] = rightPct;
    }
    lanes.set(row.id, assigned);
  }
  return lanes;
}

const LANE_HEIGHT = 38;
const LANE_GAP = 4;
const LANE_PAD = 6;

// Minimum content width on mobile (px) — forces horizontal scroll even at zoom 1×
const MOBILE_MIN_WIDTH = 300;

const BLOCK_COLORS = [
  { bg: 'hsl(var(--primary))', text: 'hsl(var(--primary-foreground))' },
  { bg: 'hsl(160 60% 45%)', text: 'hsl(0 0% 100%)' },
  { bg: 'hsl(220 70% 55%)', text: 'hsl(0 0% 100%)' },
  { bg: 'hsl(280 60% 55%)', text: 'hsl(0 0% 100%)' },
  { bg: 'hsl(35 80% 50%)', text: 'hsl(0 0% 100%)' },
];

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
  const [editingRow, setEditingRow] = useState<PatchplanRow | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editUniverse, setEditUniverse] = useState('');
  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();

  // ── Zoom state ─────────────────────────────────────────────────────────────
  const [zoomScale, setZoomScale] = useState(1);
  // Ref mirrors state so touch-event closures always read the latest value
  const zoomScaleRef = useRef(1);
  // Outer wrapper — touch listeners attach here
  const wrapperRef = useRef<HTMLDivElement>(null);
  // After a zoom render we need to reposition the scroll container
  const pendingScrollRef = useRef<{ el: HTMLDivElement; left: number } | null>(null);

  const updateZoom = useCallback((v: number) => {
    zoomScaleRef.current = v;
    setZoomScale(v);
  }, []);

  // Apply the pending scroll AFTER React re-renders at the new zoom level
  useEffect(() => {
    if (pendingScrollRef.current) {
      const { el, left } = pendingScrollRef.current;
      el.scrollLeft = left;
      pendingScrollRef.current = null;
    }
  }, [zoomScale]);

  // Attach non-passive touch listeners for pinch-to-zoom
  useEffect(() => {
    if (!isMobile) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const getDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    // Mutable pinch session (lives entirely in the closure, no React state)
    let startDist = 0;
    let startScale = 1;
    let midClientX = 0;
    let startScrollLeft = 0;
    let activeContainer: HTMLDivElement | null = null;
    let isPinching = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      isPinching = true;
      startDist = getDistance(e.touches[0], e.touches[1]);
      startScale = zoomScaleRef.current;
      midClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const target = e.target as HTMLElement;
      activeContainer =
        (target.closest('.dmx-scroll-container') as HTMLDivElement | null);
      startScrollLeft = activeContainer?.scrollLeft ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPinching || e.touches.length !== 2) return;
      // Prevent browser scroll/zoom during pinch
      e.preventDefault();

      const dist = getDistance(e.touches[0], e.touches[1]);
      const newScale = Math.min(8, Math.max(1, startScale * (dist / startDist)));

      // Keep the pinch midpoint anchored in the content
      if (activeContainer) {
        const rect = activeContainer.getBoundingClientRect();
        const pinchRelX = midClientX - rect.left;
        // Content-pixel that was under the pinch midpoint at gesture start
        const contentAnchor = startScrollLeft + pinchRelX;
        // Where that pixel lands after scaling
        const currentMidX =
          (e.touches[0].clientX + e.touches[1].clientX) / 2;

        const moveDelta = currentMidX - midClientX;

        // Bias: Richtung beeinflusst Zoom-Fokus
        const directionalBias = moveDelta * 1.5;

        const newScrollLeft = Math.max(
          0,
          contentAnchor * (newScale / startScale) -
            pinchRelX -
            directionalBias
        );
        pendingScrollRef.current = { el: activeContainer, left: newScrollLeft };
      }

      zoomScaleRef.current = newScale;
      setZoomScale(newScale);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isPinching = false;
        activeContainer = null;
      }
    };

    wrapper.addEventListener('touchstart', onTouchStart, { passive: true });
    wrapper.addEventListener('touchmove', onTouchMove, { passive: false });
    wrapper.addEventListener('touchend', onTouchEnd, { passive: true });
    wrapper.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      wrapper.removeEventListener('touchstart', onTouchStart);
      wrapper.removeEventListener('touchmove', onTouchMove);
      wrapper.removeEventListener('touchend', onTouchEnd);
      wrapper.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isMobile]); // zoomScaleRef is always current — no dep needed
  useEffect(() => {
    return () => { dragCleanupRef.current?.(); };
  }, []);

  // ── Drag state ─────────────────────────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPreviewAddr, setDragPreviewAddr] = useState<number | null>(null);
  const dragStartRef = useRef<{
    x: number;
    startAddr: number;
    containerLeft: number;
    containerWidth: number;
  } | null>(null);
  const dragRowRef = useRef<PatchplanRow | null>(null);
  const dragPreviewAddrRef = useRef<number | null>(null);
  dragPreviewAddrRef.current = dragPreviewAddr;
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const universeGroups = useMemo(() => {
    const groups = new Map<number, PatchplanRow[]>();
    rows.forEach(row => {
      if (!groups.has(row.universe)) groups.set(row.universe, []);
      groups.get(row.universe)!.push(row);
    });
    return groups;
  }, [rows]);

  const hasConflict = (row: PatchplanRow): boolean =>
    conflicts.some(c => c.row1.id === row.id || c.row2.id === row.id);

  const isRelatedToHovered = (row: PatchplanRow): boolean => {
    if (!hoveredRowId) return false;
    return conflicts.some(
      c =>
        (c.row1.id === hoveredRowId && c.row2.id === row.id) ||
        (c.row2.id === hoveredRowId && c.row1.id === row.id),
    );
  };

  const handleBlockClick = (row: PatchplanRow) => {
    if (onInstanceChange) {
      setEditingRow(row);
      setEditAddress(String(row.startAddress));
      setEditUniverse(String(row.universe));
    } else {
      onRowClick?.(row);
    }
  };

  const handleSave = async () => {
    if (!editingRow || !onInstanceChange) return;
    setSaving(true);
    try {
      const newAddr = parseInt(editAddress, 10);
      const newUniv = parseInt(editUniverse, 10);
      await onInstanceChange(editingRow.itemId, editingRow.instanceNumber, newAddr, newUniv);
      setEditingRow(null);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!editingRow || !onResetInstance) return;
    setSaving(true);
    try {
      await onResetInstance(editingRow.itemId, editingRow.instanceNumber);
      setEditingRow(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDragStartStable = useCallback(
    (e: React.MouseEvent, device: PatchplanRow, containerEl: HTMLDivElement) => {
      if (isMobile || !onInstanceChange) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = containerEl.getBoundingClientRect();
      dragStartRef.current = {
        x: e.clientX,
        startAddr: device.startAddress,
        containerLeft: rect.left,
        containerWidth: rect.width,
      };
      dragRowRef.current = device;
      setDraggingId(device.id);
      setDragPreviewAddr(device.startAddress);

      const handleMouseMove = (me: MouseEvent) => {
        if (!dragStartRef.current || !dragRowRef.current) return;
        const { containerWidth } = dragStartRef.current;
        const deltaPx = me.clientX - dragStartRef.current.x;
        const deltaChannels = Math.round((deltaPx / containerWidth) * 512);
        const newAddr = Math.max(
          1,
          Math.min(
            512 - dragRowRef.current.channels + 1,
            dragStartRef.current.startAddr + deltaChannels,
          ),
        );
        setDragPreviewAddr(newAddr);
      };

      const handleMouseUp = async () => {
        dragCleanupRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        const row = dragRowRef.current;
        const finalAddr = dragPreviewAddrRef.current;
        setDraggingId(null);
        setDragPreviewAddr(null);
        dragStartRef.current = null;
        dragRowRef.current = null;

        if (row && finalAddr !== null && finalAddr !== row.startAddress && onInstanceChange) {
          await onInstanceChange(row.itemId, row.instanceNumber, finalAddr, row.universe);
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      dragCleanupRef.current = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    },
    [isMobile, onInstanceChange],
  );

  // More ruler marks when zoomed in on mobile
  const getStepSize = (zoom: number) => {
    if (zoom >= 6) return 16;
    if (zoom >= 4) return 32;
    if (zoom >= 2) return 64;
    return 128;
  };

  const step = useMemo(() => {
    if (zoomScale >= 6) return 16;
    if (zoomScale >= 4) return 32;
    if (zoomScale >= 2) return 64;
    return 128;
  }, [zoomScale]);

  const rulerMarks = useMemo<number[]>(() => {
    const marks: number[] = [];
    for (let i = 1; i <= 512; i += step) {
      marks.push(i);
    }
    if (!marks.includes(512)) marks.push(512);
    return marks;
  }, [step]);

  // Inner content width for mobile scroll container
  const mobileInnerStyle: React.CSSProperties | undefined = isMobile
    ? {
        // At zoom 1 enforce a minimum that forces horizontal scroll;
        // beyond that, grow proportionally with the zoom level.
        minWidth: `${MOBILE_MIN_WIDTH}px`,
        width: zoomScale > 1.05 ? `${zoomScale * 100}%` : undefined,
      }
    : undefined;

  const displayZoom = Math.round(zoomScale * 10) / 10;

  return (
    <>
      <div ref={wrapperRef} className="space-y-4 sm:space-y-6 w-full overflow-x-hidden">

        {/* ── Zoom hint / reset (mobile only) ───────────────────────────── */}
        {isMobile && (
          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground select-none">
            <span className="flex items-center gap-1 opacity-60">
              <ZoomIn className="h-3 w-3" />
              {t('dmx_timeline.zoom_hint')}
            </span>
            {zoomScale > 1.05 && (
              <button
                className="flex items-center gap-1 text-primary font-medium"
                onClick={() => updateZoom(1)}
              >
                {t('dmx_timeline.zoom_reset', { scale: displayZoom })}
              </button>
            )}
          </div>
        )}

        {Array.from(universeGroups.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([universe, universeRows]) => {
            const lanes = assignLanes(universeRows);
            const laneCount = Math.max(...Array.from(lanes.values())) + 1;
            const timelineHeight =
              laneCount * (LANE_HEIGHT + LANE_GAP) + LANE_PAD * 2 - LANE_GAP;
            const sortedRows = [...universeRows].sort(
              (a, b) => a.startAddress - b.startAddress,
            );

            return (
              <div
                key={universe}
                className="rounded-xl border border-border/50 bg-card overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-border/30 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-semibold tracking-wide">
                      Universe {universe}
                    </h3>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">
                    {t('dmx_timeline.device_count', { count: universeRows.length })}
                  </span>
                </div>

                {/* Timeline area
                    ─ dmx-scroll-container class is used by the pinch handler
                      to locate the correct scrollable element                */}
                <div
                  className="dmx-scroll-container w-full px-1.5 sm:px-4 pt-2 sm:pt-3 pb-1.5 sm:pb-2 overflow-x-auto"
                  // smooth momentum scrolling on iOS
                  style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                >
                  <div className="relative" style={mobileInnerStyle}>
                    {/* Ruler */}
                    <div className="relative h-4 sm:h-5 mb-1">
                      {rulerMarks.map(m => (
                        <span
                          key={m}
                          className="absolute text-[8px] sm:text-[10px] text-muted-foreground/60 font-mono -translate-x-1/2"
                          style={{ left: `${((m - 1) / 511) * 100}%` }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>

                    {/* Timeline container */}
                    <TimelineContainer
                      timelineHeight={timelineHeight}
                      sortedRows={sortedRows}
                      lanes={lanes}
                      rulerMarks={rulerMarks}
                      hoveredRowId={hoveredRowId}
                      draggingId={draggingId}
                      dragPreviewAddr={dragPreviewAddr}
                      hasConflict={hasConflict}
                      isRelatedToHovered={isRelatedToHovered}
                      onRowHover={onRowHover}
                      onBlockClick={handleBlockClick}
                      onDragStart={handleDragStartStable}
                      isMobile={isMobile}
                      canDrag={!!onInstanceChange}
                    />
                  </div>
                </div>

                {/* Device legend */}
                <div className="px-3 sm:px-5 py-2 sm:py-3 border-t border-border/20 bg-muted/5">
                  <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1">
                    {sortedRows.map((row, idx) => {
                      const colorIdx = idx % BLOCK_COLORS.length;
                      const conflict = hasConflict(row);
                      const hovered = hoveredRowId === row.id;
                      return (
                        <div
                          key={row.id}
                          className={cn(
                            'flex items-center gap-1.5 text-[10px] sm:text-xs cursor-pointer transition-all rounded px-1 sm:px-1.5 py-0.5 -mx-1',
                            hovered && 'bg-muted/50',
                            hoveredRowId && !hovered && 'opacity-40',
                          )}
                          onMouseEnter={() => onRowHover?.(row)}
                          onMouseLeave={() => onRowHover?.(null)}
                          onClick={() => handleBlockClick(row)}
                        >
                          <div
                            className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-sm shrink-0"
                            style={{
                              background: conflict
                                ? 'hsl(var(--destructive))'
                                : BLOCK_COLORS[colorIdx].bg,
                            }}
                          />
                          <span className="text-foreground/80 font-medium truncate max-w-[80px] sm:max-w-[120px]">
                            {row.itemName}
                          </span>
                          {row.totalInstances > 1 && (
                            <span className="text-muted-foreground font-mono">
                              #{row.instanceNumber}
                            </span>
                          )}
                          <span className="text-muted-foreground font-mono text-[9px] sm:text-[10px]">
                            {row.startAddress}–{row.endAddress}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/50 p-8 sm:p-12 text-center text-muted-foreground">
            {t('dmx_timeline.empty')}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingRow} onOpenChange={open => !open && setEditingRow(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('dmx_timeline.edit_dialog.title')}</DialogTitle>
              <DialogDescription>
                {editingRow && (
                  <>
                    <strong>{editingRow.itemName}</strong>
                    {editingRow.totalInstances > 1 && (
                      <span>
                        {' '}— {t('dmx_timeline.edit_dialog.instance_of', {
                          current: editingRow.instanceNumber,
                          total: editingRow.totalInstances,
                        })}
                      </span>
                    )}
                    {editingRow.hasCustomConfig && (
                      <span className="ml-1 text-primary">
                        {t('dmx_timeline.edit_dialog.custom_config')}
                      </span>
                    )}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {editingRow && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">{t('dmx_timeline.edit_dialog.start_address')}</Label>
                    <Input
                      id="edit-address"
                      type="number"
                      min={1}
                      max={512}
                      value={editAddress}
                      onChange={e => setEditAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-universe">{t('dmx_timeline.edit_dialog.universe')}</Label>
                    <Input
                      id="edit-universe"
                      type="number"
                      min={1}
                      value={editUniverse}
                      onChange={e => setEditUniverse(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('dmx_timeline.edit_dialog.channels_info', {
                    channels: editingRow.channels,
                    end: parseInt(editAddress, 10) + editingRow.channels - 1 || '–',
                  })}
                </p>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {editingRow?.hasCustomConfig && onResetInstance && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={saving}
                  className="text-muted-foreground sm:mr-auto"
                >
                  {t('common.reset')}
                </Button>
              )}
              <Button variant="outline" onClick={() => setEditingRow(null)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

// ── TimelineContainer ─────────────────────────────────────────────────────────

interface TimelineContainerProps {
  timelineHeight: number;
  sortedRows: PatchplanRow[];
  lanes: Map<string, number>;
  rulerMarks: number[];
  hoveredRowId?: string | null;
  draggingId: string | null;
  dragPreviewAddr: number | null;
  hasConflict: (row: PatchplanRow) => boolean;
  isRelatedToHovered: (row: PatchplanRow) => boolean;
  onRowHover?: (row: PatchplanRow | null) => void;
  onBlockClick: (row: PatchplanRow) => void;
  onDragStart: (
    e: React.MouseEvent,
    device: PatchplanRow,
    container: HTMLDivElement,
  ) => void;
  isMobile: boolean;
  canDrag: boolean;
}

function TimelineContainer({
  timelineHeight,
  sortedRows,
  lanes,
  hoveredRowId,
  draggingId,
  dragPreviewAddr,
  rulerMarks,
  hasConflict,
  isRelatedToHovered,
  onRowHover,
  onBlockClick,
  onDragStart,
  isMobile,
  canDrag,
}: TimelineContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg"
      style={{ height: timelineHeight }}
    >
      {/* Background */}
      <div className="absolute inset-0 rounded-lg border border-border/20 bg-muted/5" />

      {/* Grid lines at 64-channel intervals */}
      {rulerMarks.map(a => (
        <div
          key={a}
          className="absolute top-0 h-full border-l border-dashed border-border/15"
          style={{ left: `${((a - 1) / 511) * 100}%` }}
        />
      ))}

      {/* Drag preview ghost line */}
      {draggingId && dragPreviewAddr !== null && (
        <div
          className="absolute top-0 h-full border-l-2 border-primary/60 z-30 pointer-events-none"
          style={{ left: `${((dragPreviewAddr - 1) / 511) * 100}%` }}
        >
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-primary bg-card px-1 rounded">
            {dragPreviewAddr}
          </span>
        </div>
      )}

      {/* Device blocks */}
      {sortedRows.map((device, idx) => {
        const lane = lanes.get(device.id) ?? 0;
        const isDragging = draggingId === device.id;
        const displayAddr =
          isDragging && dragPreviewAddr !== null ? dragPreviewAddr : device.startAddress;
        const displayEnd = displayAddr + device.channels - 1;
        const left = ((displayAddr - 1) / 511) * 100;
        const widthPct = (device.channels / 512) * 100;
        const conflict = hasConflict(device);
        const hovered = hoveredRowId === device.id;
        const related = isRelatedToHovered(device);
        const colorIdx = idx % BLOCK_COLORS.length;
        const topPos = LANE_PAD + lane * (LANE_HEIGHT + LANE_GAP);

        return (
          <div
            key={device.id}
            className={cn(
              'absolute flex items-center rounded-md transition-all duration-150 group select-none',
              !isDragging && 'cursor-pointer',
              isDragging && 'cursor-grabbing z-30 ring-2 ring-primary/80 shadow-xl',
              conflict && !isDragging && 'ring-1 ring-destructive/60',
              hovered && !isDragging && 'ring-2 ring-foreground/50 scale-[1.03] z-20 shadow-lg',
              related && !isDragging && 'ring-2 ring-yellow-500/60 z-10',
              hoveredRowId && !hovered && !related && !isDragging && 'opacity-40',
            )}
            style={{
              left: `${left}%`,
              width: `max(${widthPct}%, 28px)`,
              top: topPos,
              height: LANE_HEIGHT,
              background: isDragging
                ? 'hsl(var(--primary) / 0.85)'
                : conflict
                  ? 'hsl(var(--destructive))'
                  : BLOCK_COLORS[colorIdx].bg,
              color:
                conflict && !isDragging
                  ? 'hsl(var(--destructive-foreground))'
                  : BLOCK_COLORS[colorIdx].text,
              boxShadow: isDragging
                ? '0 8px 24px rgba(0,0,0,0.4)'
                : hovered
                  ? '0 4px 16px rgba(0,0,0,0.3)'
                  : '0 1px 3px rgba(0,0,0,0.15)',
              transition: isDragging ? 'box-shadow 0.15s' : undefined,
            }}
            onMouseEnter={() => !isDragging && onRowHover?.(device)}
            onMouseLeave={() => !isDragging && onRowHover?.(null)}
            onClick={e => {
              if (isDragging) return;
              e.stopPropagation();
              onBlockClick(device);
            }}
            title={`${device.itemName} ${device.totalInstances > 1 ? `#${device.instanceNumber}` : ''} — CH ${displayAddr}–${displayEnd}`}
          >
            {/* Drag handle (desktop only) */}
            {canDrag && !isMobile && (
              <div
                className="flex items-center justify-center w-5 h-full cursor-grab opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity shrink-0"
                onMouseDown={e => {
                  if (containerRef.current) {
                    onDragStart(e, device, containerRef.current);
                  }
                }}
                onClick={e => e.stopPropagation()}
              >
                <GripHorizontal className="h-3 w-3 rotate-90" />
              </div>
            )}

            {/* Pencil overlay on hover */}
            {canDrag && !isMobile && (
              <div
                className="absolute top-0.5 right-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                aria-hidden
              >
                <div className="rounded p-0.5 bg-black/20">
                  <Pencil className="h-2.5 w-2.5 text-white drop-shadow" />
                </div>
              </div>
            )}

            {/* Content */}
            <div
              className={cn(
                'flex items-center gap-1 min-w-0 flex-1 pointer-events-none overflow-hidden',
                canDrag && !isMobile ? 'pr-1.5' : 'px-1.5',
              )}
            >
              {conflict && <AlertTriangle className="h-3 w-3 shrink-0" />}
              <span className="truncate text-[9px] sm:text-[11px] font-medium leading-tight">
                {widthPct > 5 ? device.itemName : ''}
              </span>
              {device.totalInstances > 1 && widthPct > 10 && (
                <span className="text-[8px] sm:text-[9px] font-mono opacity-70 shrink-0">
                  #{device.instanceNumber}
                </span>
              )}
              <span className="ml-auto shrink-0 text-[8px] sm:text-[9px] font-mono opacity-80">
                {widthPct > 4 ? displayAddr : ''}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}