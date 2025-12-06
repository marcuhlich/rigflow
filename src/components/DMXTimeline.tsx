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
  // Gruppiere nach Universe
  const universeGroups = new Map<number, PatchplanRow[]>();
  rows.forEach(row => {
    if (!universeGroups.has(row.universe)) {
      universeGroups.set(row.universe, []);
    }
    universeGroups.get(row.universe)!.push(row);
  });

  const hasConflict = (row: PatchplanRow): boolean => {
    return conflicts.some(
      c => 
        (c.row1.id === row.id && c.row2.id === row.id) ||
        (c.row1.itemId === row.itemId && c.row1.instanceNumber === row.instanceNumber) ||
        (c.row2.itemId === row.itemId && c.row2.instanceNumber === row.instanceNumber)
    );
  };

  const isRelatedToHovered = (row: PatchplanRow): boolean => {
    if (!hoveredRowId) return false;
    return conflicts.some(
      c =>
        (c.row1.id === hoveredRowId && c.row2.id === row.id) ||
        (c.row2.id === hoveredRowId && c.row1.id === row.id) ||
        (c.row1.id === hoveredRowId && c.row1.id === row.id) ||
        (c.row2.id === hoveredRowId && c.row2.id === row.id)
    );
  };

  return (
    <div className="space-y-6">
      {Array.from(universeGroups.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([universe, universeRows]) => (
          <div
            key={universe}
            className="glass-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Universum {universe}
              </h3>
              <span className="text-xs text-muted-foreground">
                {universeRows.reduce((sum, r) => Math.max(sum, r.endAddress), 0)}/512 Kanäle genutzt
              </span>
            </div>

            {/* Visual Timeline Bar */}
            <div className="relative h-10 bg-muted/30 rounded-lg overflow-hidden border border-border/50">
              {/* Address markers */}
              <div className="absolute inset-0 flex justify-between px-3 text-xs text-muted-foreground/50 pt-1">
                <span>1</span>
                <span>128</span>
                <span>256</span>
                <span>384</span>
                <span>512</span>
              </div>

              {/* Grid lines */}
              {[1, 128, 256, 384, 512].map(addr => (
                <div
                  key={addr}
                  className="absolute top-0 h-full w-px bg-border/20"
                  style={{ left: `${((addr - 1) / 512) * 100}%` }}
                />
              ))}

              {/* Device blocks */}
              {universeRows.map(row => {
                const left = ((row.startAddress - 1) / 512) * 100;
                const width = ((row.endAddress - row.startAddress + 1) / 512) * 100;
                const conflict = hasConflict(row);
                const relatedHovered = isRelatedToHovered(row);
                const isHovered = hoveredRowId === row.id;

                return (
                  <div
                    key={row.id}
                    className={cn(
                      'absolute top-7 h-5 rounded flex items-center justify-center text-[10px] font-medium px-1 truncate cursor-pointer transition-all',
                      conflict
                        ? 'bg-destructive/80 text-destructive-foreground'
                        : 'bg-primary/70 text-primary-foreground hover:bg-primary',
                      isHovered && 'ring-2 ring-foreground scale-105 z-10',
                      relatedHovered && 'opacity-100 ring-2 ring-warning',
                      hoveredRowId && !isHovered && !relatedHovered && 'opacity-30'
                    )}
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 2)}%`,
                    }}
                    onMouseEnter={() => onRowHover?.(row)}
                    onMouseLeave={() => onRowHover?.(null)}
                    onClick={() => onRowClick?.(row)}
                    title={`${row.itemName} #${row.instanceNumber}: ${row.startAddress}-${row.endAddress}`}
                  >
                    {width > 8 && `${row.startAddress}-${row.endAddress}`}
                  </div>
                );
              })}
            </div>

            {/* Detailed List */}
            <div className="space-y-1 mt-3">
              {universeRows.map(row => {
                const conflict = hasConflict(row);
                const isHovered = hoveredRowId === row.id;

                return (
                  <div
                    key={row.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded border text-sm transition-all',
                      conflict
                        ? 'border-destructive/50 bg-destructive/5'
                        : 'border-border/30 bg-muted/20 hover:bg-muted/40',
                      isHovered && 'ring-2 ring-primary'
                    )}
                    onMouseEnter={() => onRowHover?.(row)}
                    onMouseLeave={() => onRowHover?.(null)}
                    onClick={() => onRowClick?.(row)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {conflict && (
                        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {row.itemName}
                          {row.totalInstances > 1 && (
                            <span className="text-xs font-normal text-muted-foreground">
                              #{row.instanceNumber}/{row.totalInstances}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.location}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono whitespace-nowrap ml-2">
                      <div className="text-right">
                        <div className="font-medium">{row.startAddress}-{row.endAddress}</div>
                        <div className="text-muted-foreground">{row.channels}ch</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {rows.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Keine DMX-Geräte konfiguriert</p>
        </div>
      )}
    </div>
  );
}
