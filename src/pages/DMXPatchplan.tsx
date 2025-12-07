import { useMemo, useState } from "react";
import { AlertTriangle, Sliders, Table as TableIcon, LayoutGrid, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBadge } from "@/components/StatusBadge";
import { useInventory } from "@/hooks/useInventory";
import { useDMXPatchplan } from "@/hooks/useDMXPatchplan";
import { cn } from "@/lib/utils";
import { DMXTimeline } from "@/components/DMXTimeline";
import { DMXPatchplanTable } from "@/components/DMXPatchplanTable";
import { exportPatchplanAsCSV } from "@/lib/dmxPatchplan";
import { PatchplanRow } from "@/lib/dmxPatchplan";

export default function DMXPatchplan() {
  const { allItems, loading } = useInventory();
  const {
    patchplan,
    conflicts,
    universeUsage,
    updateItemDMXAddress,
    updateItemDMXUniverse,
    autoAssignNextAvailable,
  } = useDMXPatchplan();
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('timeline');
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleExportCSV = () => {
    const csv = exportPatchplanAsCSV(patchplan);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dmx-patchplan-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sliders className="h-6 w-6 text-primary" />
            DMX Patchplan
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {patchplan.length} Kanal-Zuweisungen aus {allItems.filter(i => i.dmx_start_address && i.dmx_channels).length} Geräten
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('timeline')}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Timeline
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="gap-2"
          >
            <TableIcon className="h-4 w-4" />
            Tabelle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2"
            disabled={patchplan.length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Auslastung pro Universe */}
      {Object.keys(universeUsage).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(universeUsage).map(([universe, usedChannels]) => (
            <div key={universe} className="glass-card p-3">
              <div className="text-sm font-medium text-muted-foreground">Universe {universe}</div>
              <div className="mt-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      (usedChannels / 512) > 0.9
                        ? 'bg-destructive'
                        : (usedChannels / 512) > 0.7
                        ? 'bg-yellow-500'
                        : 'bg-primary'
                    )}
                    style={{ width: `${Math.min((usedChannels / 512) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {usedChannels}/512 Kanäle
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Konflikt-Warnung */}
      {conflicts.length > 0 && (
        <Alert variant="destructive" className="glass-card border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>DMX-Adresskonflikte erkannt!</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm">
              {conflicts.slice(0, 5).map((conflict, i) => (
                <li key={i}>
                  <strong>{conflict.row1.itemName}</strong> #{conflict.row1.instanceNumber}{' '}
                  ({conflict.row1.startAddress}-{conflict.row1.endAddress}) überschneidet sich mit{' '}
                  <strong>{conflict.row2.itemName}</strong> #{conflict.row2.instanceNumber}{' '}
                  ({conflict.row2.startAddress}-{conflict.row2.endAddress})
                </li>
              ))}
              {conflicts.length > 5 && (
                <li className="text-muted-foreground">... und {conflicts.length - 5} weitere</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Hauptinhalte */}
      {patchplan.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Sliders className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Keine DMX-Geräte gefunden</h3>
          <p className="text-muted-foreground mt-1">
            Füge DMX-Adressen und Kanalanzahl zu deinen Lichttechnik- oder Effektgeräten hinzu.
          </p>
        </div>
      ) : viewMode === 'timeline' ? (
        <DMXTimeline
          rows={patchplan}
          conflicts={conflicts}
          hoveredRowId={hoveredRowId}
          onRowHover={(row) => setHoveredRowId(row?.id ?? null)}
          onAddressChange={updateItemDMXAddress}
          onUniverseChange={updateItemDMXUniverse}
        />
      ) : (
        <DMXPatchplanTable
          rows={patchplan}
          conflicts={conflicts}
          onAddressChange={updateItemDMXAddress}
          onUniverseChange={updateItemDMXUniverse}
          onAutoAssign={autoAssignNextAvailable}
          loading={loading}
        />
      )}
    </div>
  );
}
