// Optimized DMXTimeline component
// Cleaned layout, smoother visuals, increased minimum width, full-width timeline, improved spacing

import { PatchplanRow, DMXConflict } from '@/lib/dmxPatchplan';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface DMXTimelineProps {
  rows: PatchplanRow[];
  conflicts: DMXConflict[];
  onRowClick?: (row: PatchplanRow) => void;
  onRowHover?: (row: PatchplanRow | null) => void;
  hoveredRowId?: string | null;
}

export function DMXTimeline({
  rows,
  conflicts,
  onRowClick,
  onRowHover,
  hoveredRowId,
}: DMXTimelineProps) {
  const universeGroups = new Map<number, PatchplanRow[]>();
  rows.forEach(row => {
    if (!universeGroups.has(row.universe)) universeGroups.set(row.universe, []);
    universeGroups.get(row.universe)!.push(row);
  });

  const calculateRows = (universeRows: PatchplanRow[]): PatchplanRow[][] => {
    const sorted = [...universeRows].sort((a, b) => a.startAddress - b.startAddress);
    const display: PatchplanRow[][] = [];

    for (const device of sorted) {
      let placed = false;
      for (const line of display) {
        const conflict = line.some(existing => {
          return !(device.endAddress < existing.startAddress || device.startAddress > existing.endAddress);
        });
        if (!conflict) {
          line.push(device);
          placed = true;
          break;
        }
      }
      if (!placed) display.push([device]);
    }

    return display;
  };

  const hasConflict = (row: PatchplanRow): boolean => {
    return conflicts.some(c => c.row1.id === row.id || c.row2.id === row.id);
  };

  const isRelatedToHovered = (row: PatchplanRow): boolean => {
    if (!hoveredRowId) return false;
    return conflicts.some(c => c.row1.id === hoveredRowId && c.row2.id === row.id || c.row2.id === hoveredRowId && c.row1.id === row.id);
  };

  return (
    <div className="space-y-10">
      {Array.from(universeGroups.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([universe, universeRows]) => {
          const timelineRows = calculateRows(universeRows);

          return (
            <div key={universe} className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Universe {universe}</h3>
                <span className="text-sm text-muted-foreground">
                  {universeRows.reduce((sum, r) => Math.max(sum, r.endAddress), 0)}/512 Kanäle
                </span>
              </div>

{/* Ruler */}
{(() => {
  const minAddr = Math.min(...universeRows.map(r => r.startAddress));
  const maxAddr = Math.max(...universeRows.map(r => r.endAddress));
  const range = maxAddr - minAddr + 1;
  const steps = 5;
  const markers = Array.from({ length: steps }, (_, i) => Math.round(minAddr + (i * range) / (steps - 1)));
  return (
    <div className="px-2 text-xs text-muted-foreground flex justify-between">
      {markers.map(m => <span key={m}>{m}</span>)}
    </div>
  );
})()}

<div className="space-y-3">
  {timelineRows.map((rowDevices, idx) => (
    <div key={idx} className="relative h-16 w-full rounded-lg border border-border/40 bg-muted/20 overflow-hidden">
      
      {/* Fixed DMX grid */}
      {[128, 256, 384, 512].map(a => (
        <div
          key={a}
          className="absolute top-0 h-full w-px bg-border/30"
          style={{ left: `${(a / 512) * 100}%` }}
        />
      ))}

      {rowDevices.map(device => {
        // Berechnung fix auf 512 Kanäle
        const left = ((device.startAddress - 1) / 512) * 100;
        const widthPercent = ((device.endAddress - device.startAddress + 1) / 512) * 100;

        const conflict = hasConflict(device);
        const hovered = hoveredRowId === device.id;
        const related = isRelatedToHovered(device);

        return (
          <div
            key={device.id}
            className={cn(
              "absolute top-1 bottom-1 flex items-center justify-center rounded-md text-xs font-medium px-3 truncate cursor-pointer transition-all shadow-sm min-w-[12px]",
              conflict
                ? "bg-destructive/80 text-destructive-foreground hover:bg-destructive"
                : "bg-primary/70 text-primary-foreground hover:bg-primary/90",
              hovered && "ring-2 ring-offset-1 ring-foreground scale-[1.05] z-10",
              related && "ring-2 ring-warning z-10",
              hoveredRowId && !hovered && !related && "opacity-40"
            )}
            style={{ left: `${left}%`, width: `${widthPercent}%` }}
            onMouseEnter={() => onRowHover?.(device)}
            onMouseLeave={() => onRowHover?.(null)}
            onClick={() => onRowClick?.(device)}
          >
            {widthPercent > 1 && `${device.startAddress}-${device.endAddress}`}
          </div>
        );
      })}
    </div>
  ))}
</div>

              {/* Device List */}
              <div className="border-t border-border/20 pt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Geräte</p>

                {universeRows.map(row => {
                  const conflict = hasConflict(row);
                  const hovered = hoveredRowId === row.id;

                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-all",
                        conflict
                          ? "border-destructive/40 bg-destructive/10 hover:bg-destructive/20"
                          : "border-border/30 bg-muted/10 hover:bg-muted/25",
                        hovered && "ring-2 ring-primary/50 shadow-md"
                      )}
                      onMouseEnter={() => onRowHover?.(row)}
                      onMouseLeave={() => onRowHover?.(null)}
                      onClick={() => onRowClick?.(row)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {conflict && <AlertTriangle className="h-4 w-4 text-destructive" />}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 font-medium text-sm truncate">
                            {row.itemName}
                            {row.totalInstances > 1 && (
                              <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                                #{row.instanceNumber}/{row.totalInstances}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">📍 {row.location}</div>
                        </div>
                      </div>

                      <div className="font-mono text-xs text-right ml-4">
                        <div className="font-semibold">{row.startAddress}-{row.endAddress}</div>
                        <div className="text-muted-foreground">{row.channels} Kanäle</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      {rows.length === 0 && (
        <div className="glass-card p-12 text-center text-muted-foreground">
          Keine DMX-Geräte konfiguriert
        </div>
      )}
    </div>
  );
}
