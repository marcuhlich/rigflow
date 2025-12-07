import { useState } from 'react';
import { PatchplanRow, DMXConflict } from '@/lib/dmxPatchplan';
import { cn } from '@/lib/utils';
import { AlertTriangle, MapPin } from 'lucide-react';
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
  onAddressChange?: (itemId: string, newAddress: number) => Promise<void>;
  onUniverseChange?: (itemId: string, newUniverse: number) => Promise<void>;
}

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

  const universeGroups = new Map<number, PatchplanRow[]>();
  rows.forEach(row => {
    if (!universeGroups.has(row.universe)) universeGroups.set(row.universe, []);
    universeGroups.get(row.universe)!.push(row);
  });

  const hasConflict = (row: PatchplanRow): boolean => {
    return conflicts.some(c => c.row1.id === row.id || c.row2.id === row.id);
  };

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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8">
        {Array.from(universeGroups.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([universe, universeRows]) => {
            const sortedRows = [...universeRows].sort((a, b) => a.startAddress - b.startAddress);
            const maxEnd = universeRows.reduce((max, r) => Math.max(max, r.endAddress), 0);

            return (
              <div key={universe} className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Universe {universe}</h3>
                  <span className="text-sm text-muted-foreground">
                    {maxEnd}/512 Kanäle
                  </span>
                </div>

                {/* Ruler */}
                <div className="px-1 text-xs text-muted-foreground flex justify-between">
                  {[1, 128, 256, 384, 512].map(m => (
                    <span key={m}>{m}</span>
                  ))}
                </div>

                {/* Timeline Bar */}
                <div className="relative h-12 w-full rounded-lg border border-border/40 bg-muted/20 overflow-visible">
                  {/* Grid lines */}
                  {[128, 256, 384].map(a => (
                    <div
                      key={a}
                      className="absolute top-0 h-full w-px bg-border/30"
                      style={{ left: `${(a / 512) * 100}%` }}
                    />
                  ))}

                  {/* Device blocks */}
                  {sortedRows.map(device => {
                    const left = ((device.startAddress - 1) / 512) * 100;
                    const widthPercent = ((device.endAddress - device.startAddress + 1) / 512) * 100;
                    const conflict = hasConflict(device);
                    const hovered = hoveredRowId === device.id;
                    const related = isRelatedToHovered(device);

                    return (
                      <Tooltip key={device.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'absolute top-1.5 h-9 flex items-center justify-center rounded-md text-xs font-medium px-1 truncate cursor-pointer transition-all shadow-sm border',
                              conflict
                                ? 'bg-destructive/90 text-destructive-foreground border-destructive hover:bg-destructive'
                                : 'bg-primary text-primary-foreground border-primary/50 hover:bg-primary/90',
                              hovered && 'ring-2 ring-offset-1 ring-foreground scale-105 z-20',
                              related && 'ring-2 ring-yellow-500 z-10',
                              hoveredRowId && !hovered && !related && 'opacity-50'
                            )}
                            style={{
                              left: `${left}%`,
                              width: `max(${widthPercent}%, 24px)`,
                              minWidth: '24px',
                            }}
                            onMouseEnter={() => onRowHover?.(device)}
                            onMouseLeave={() => onRowHover?.(null)}
                            onClick={() => handleBlockClick(device)}
                          >
                            <span className="truncate text-[10px]">
                              {widthPercent > 3 ? `${device.startAddress}-${device.endAddress}` : ''}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" avoidCollisions align="start" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">{device.itemName}</p>
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
                              Kanäle {device.startAddress}-{device.endAddress} ({device.channels} CH)
                            </p>
                            {conflict && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Adresskonflikt!
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Device List */}
                <div className="border-t border-border/20 pt-4 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Geräte ({universeRows.length})
                  </p>

                  <div className="grid gap-2">
                    {sortedRows.map(row => {
                      const conflict = hasConflict(row);
                      const hovered = hoveredRowId === row.id;

                      return (
                        <div
                          key={row.id}
                          className={cn(
                            'flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer',
                            conflict
                              ? 'border-destructive/40 bg-destructive/10 hover:bg-destructive/20'
                              : 'border-border/30 bg-muted/10 hover:bg-muted/25',
                            hovered && 'ring-2 ring-primary/50 shadow-md'
                          )}
                          onMouseEnter={() => onRowHover?.(row)}
                          onMouseLeave={() => onRowHover?.(null)}
                          onClick={() => handleBlockClick(row)}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {conflict && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 font-medium text-sm truncate">
                                {row.itemName}
                                {row.totalInstances > 1 && (
                                  <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                                    #{row.instanceNumber}/{row.totalInstances}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {row.location}
                              </div>
                            </div>
                          </div>

                          <div className="font-mono text-xs text-right ml-4 shrink-0">
                            <div className="font-semibold">{row.startAddress}-{row.endAddress}</div>
                            <div className="text-muted-foreground">{row.channels} CH</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

        {rows.length === 0 && (
          <div className="glass-card p-12 text-center text-muted-foreground">
            Keine DMX-Geräte konfiguriert
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
          <DialogContent className="w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>DMX-Adresse bearbeiten</DialogTitle>
            </DialogHeader>
            {editingRow && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  <strong>{editingRow.itemName}</strong>
                  {editingRow.totalInstances > 1 && ` (Instanz ${editingRow.instanceNumber})`}
                </p>
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
