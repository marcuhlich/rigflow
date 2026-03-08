import { useState, useMemo } from 'react';
import { PatchplanRow, DMXConflict } from '@/lib/dmxPatchplan';
import { cn } from '@/lib/utils';
import { AlertTriangle, MapPin, Pencil } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

interface DMXTimelineProps {
  rows: PatchplanRow[];
  conflicts: DMXConflict[];
  onRowClick?: (row: PatchplanRow) => void;
  onRowHover?: (row: PatchplanRow | null) => void;
  hoveredRowId?: string | null;
  /** Per-instance update: (itemId, instanceNumber, address, universe) */
  onInstanceChange?: (itemId: string, instanceNumber: number, newAddress: number, newUniverse: number) => Promise<void>;
  onResetInstance?: (itemId: string, instanceNumber: number) => Promise<void>;
}

// Assign rows to visual lanes so blocks never visually overlap
function assignLanes(rows: PatchplanRow[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => a.startAddress - b.startAddress);
  const lanes = new Map<string, number>();
  const laneEnds: number[] = []; // tracks the end pixel-percentage of each lane

  for (const row of sorted) {
    const leftPct = ((row.startAddress - 1) / 512) * 100;
    // Find first lane where this block fits (with small gap)
    let assigned = -1;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= leftPct - 0.3) {
        assigned = i;
        break;
      }
    }
    const widthPct = Math.max(((row.endAddress - row.startAddress + 1) / 512) * 100, 4.7); // min visual width ~24px equivalent
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

const LANE_HEIGHT = 36;
const LANE_GAP = 4;
const LANE_PAD = 6;

// Color palette for blocks (using HSL for theme compatibility)
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
  onAddressChange,
  onUniverseChange,
}: DMXTimelineProps) {
  const [editingRow, setEditingRow] = useState<PatchplanRow | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editUniverse, setEditUniverse] = useState('');
  const [saving, setSaving] = useState(false);

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
        (c.row2.id === hoveredRowId && c.row1.id === row.id)
    );
  };

  const handleBlockClick = (row: PatchplanRow) => {
    if (onAddressChange) {
      setEditingRow(row);
      setEditAddress(String(row.startAddress));
      setEditUniverse(String(row.universe));
    } else {
      onRowClick?.(row);
    }
  };

  const handleSave = async () => {
    if (!editingRow || !onAddressChange) return;
    setSaving(true);
    try {
      const newAddr = parseInt(editAddress, 10);
      const newUniv = parseInt(editUniverse, 10);
      if (newUniv !== editingRow.universe && onUniverseChange) {
        await onUniverseChange(editingRow.itemId, newUniv);
      }
      if (newAddr !== editingRow.startAddress) {
        await onAddressChange(editingRow.itemId, newAddr);
      }
      setEditingRow(null);
    } finally {
      setSaving(false);
    }
  };

  // Ruler marks
  const rulerMarks = [1, 64, 128, 192, 256, 320, 384, 448, 512];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        {Array.from(universeGroups.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([universe, universeRows]) => {
            const lanes = assignLanes(universeRows);
            const laneCount = Math.max(...Array.from(lanes.values())) + 1;
            const timelineHeight = laneCount * (LANE_HEIGHT + LANE_GAP) + LANE_PAD * 2 - LANE_GAP;
            const sortedRows = [...universeRows].sort((a, b) => a.startAddress - b.startAddress);

            return (
              <div key={universe} className="rounded-xl border border-border/50 bg-card overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border/30 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <h3 className="text-sm font-semibold tracking-wide">Universe {universe}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {universeRows.length} {universeRows.length === 1 ? 'Gerät' : 'Geräte'}
                  </span>
                </div>

                {/* Timeline area */}
                <div className="px-2 sm:px-4 pt-3 pb-2">
                  {/* Ruler */}
                  <div className="relative h-5 mb-1">
                    {rulerMarks.map(m => (
                      <span
                        key={m}
                        className="absolute text-[9px] sm:text-[10px] text-muted-foreground/60 font-mono -translate-x-1/2"
                        style={{ left: `${((m - 1) / 511) * 100}%` }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>

                  {/* Timeline container */}
                  <div
                    className="relative w-full rounded-lg overflow-hidden"
                    style={{
                      height: timelineHeight,
                      background: 'repeating-linear-gradient(90deg, hsl(var(--muted) / 0.15) 0px, hsl(var(--muted) / 0.15) 1px, transparent 1px, transparent 12.5%)',
                    }}
                  >
                    {/* Background stripe pattern */}
                    <div className="absolute inset-0 rounded-lg border border-border/20 bg-muted/5" />

                    {/* Grid lines at 64-channel intervals */}
                    {[64, 128, 192, 256, 320, 384, 448].map(a => (
                      <div
                        key={a}
                        className="absolute top-0 h-full border-l border-dashed border-border/15"
                        style={{ left: `${((a - 1) / 511) * 100}%` }}
                      />
                    ))}

                    {/* Device blocks */}
                    {sortedRows.map((device, idx) => {
                      const lane = lanes.get(device.id) ?? 0;
                      const left = ((device.startAddress - 1) / 511) * 100;
                      const widthPct = ((device.endAddress - device.startAddress + 1) / 512) * 100;
                      const conflict = hasConflict(device);
                      const hovered = hoveredRowId === device.id;
                      const related = isRelatedToHovered(device);
                      const colorIdx = idx % BLOCK_COLORS.length;
                      const topPos = LANE_PAD + lane * (LANE_HEIGHT + LANE_GAP);

                      return (
                        <Tooltip key={device.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'absolute flex items-center rounded-md cursor-pointer transition-all duration-200 group overflow-hidden',
                                conflict && 'ring-1 ring-destructive/60',
                                hovered && 'ring-2 ring-foreground/50 scale-[1.03] z-20 shadow-lg',
                                related && 'ring-2 ring-yellow-500/60 z-10',
                                hoveredRowId && !hovered && !related && 'opacity-40'
                              )}
                              style={{
                                left: `${left}%`,
                                width: `max(${widthPct}%, 28px)`,
                                top: topPos,
                                height: LANE_HEIGHT,
                                background: conflict
                                  ? 'hsl(var(--destructive))'
                                  : BLOCK_COLORS[colorIdx].bg,
                                color: conflict
                                  ? 'hsl(var(--destructive-foreground))'
                                  : BLOCK_COLORS[colorIdx].text,
                                boxShadow: hovered
                                  ? '0 4px 16px rgba(0,0,0,0.3)'
                                  : '0 1px 3px rgba(0,0,0,0.15)',
                              }}
                              onMouseEnter={() => onRowHover?.(device)}
                              onMouseLeave={() => onRowHover?.(null)}
                              onClick={() => handleBlockClick(device)}
                            >
                              {/* Content */}
                              <div className="flex items-center gap-1 px-2 min-w-0 w-full">
                                {conflict && <AlertTriangle className="h-3 w-3 shrink-0" />}
                                <span className="truncate text-[10px] sm:text-[11px] font-medium leading-tight">
                                  {widthPct > 6 ? device.itemName : ''}
                                </span>
                                <span className="ml-auto shrink-0 text-[9px] font-mono opacity-70">
                                  {widthPct > 3 ? `${device.startAddress}` : ''}
                                </span>
                              </div>

                              {/* Hover edit icon */}
                              {onAddressChange && (
                                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Pencil className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold text-sm">{device.itemName}</p>
                              {device.totalInstances > 1 && (
                                <p className="text-xs text-muted-foreground">
                                  Instanz {device.instanceNumber}/{device.totalInstances}
                                </p>
                              )}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {device.location}
                              </div>
                              <p className="text-xs font-mono">
                                CH {device.startAddress}–{device.endAddress} ({device.channels} Kanäle)
                              </p>
                              {conflict && (
                                <p className="text-xs text-destructive flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Adresskonflikt!
                                </p>
                              )}
                              {onAddressChange && (
                                <p className="text-[10px] text-muted-foreground/70 pt-1">Klicken zum Bearbeiten</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                {/* Device legend */}
                <div className="px-4 sm:px-5 py-3 border-t border-border/20 bg-muted/5">
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {sortedRows.map((row, idx) => {
                      const colorIdx = idx % BLOCK_COLORS.length;
                      const conflict = hasConflict(row);
                      const hovered = hoveredRowId === row.id;
                      return (
                        <div
                          key={row.id}
                          className={cn(
                            'flex items-center gap-1.5 text-xs cursor-pointer transition-all rounded px-1.5 py-0.5 -mx-1.5',
                            hovered && 'bg-muted/50',
                            hoveredRowId && !hovered && 'opacity-40'
                          )}
                          onMouseEnter={() => onRowHover?.(row)}
                          onMouseLeave={() => onRowHover?.(null)}
                          onClick={() => handleBlockClick(row)}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{
                              background: conflict ? 'hsl(var(--destructive))' : BLOCK_COLORS[colorIdx].bg,
                            }}
                          />
                          <span className="text-foreground/80 font-medium truncate max-w-[120px]">
                            {row.itemName}
                          </span>
                          <span className="text-muted-foreground font-mono text-[10px]">
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
          <div className="rounded-xl border border-dashed border-border/50 p-12 text-center text-muted-foreground">
            Keine DMX-Geräte konfiguriert
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>DMX-Adresse bearbeiten</DialogTitle>
              <DialogDescription>
                {editingRow && (
                  <>
                    <strong>{editingRow.itemName}</strong>
                    {editingRow.totalInstances > 1 && ` (Instanz ${editingRow.instanceNumber})`}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            {editingRow && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Startadresse</Label>
                    <Input
                      id="edit-address"
                      type="number"
                      min={1}
                      max={512}
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-universe">Universe</Label>
                    <Input
                      id="edit-universe"
                      type="number"
                      min={1}
                      value={editUniverse}
                      onChange={(e) => setEditUniverse(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Benötigt {editingRow.channels} Kanäle → Endadresse: {parseInt(editAddress, 10) + editingRow.channels - 1 || '–'}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRow(null)}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
