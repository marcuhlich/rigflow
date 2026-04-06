import { useMemo, useState } from "react";
import { AlertTriangle, Sliders, Table as TableIcon, LayoutGrid, Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useInventory } from "@/hooks/useInventory";
import { useDMXPatchplan } from "@/hooks/useDMXPatchplan";
import { cn } from "@/lib/utils";
import { DMXTimeline } from "@/components/DMXTimeline";
import { DMXPatchplanTable } from "@/components/DMXPatchplanTable";
import { exportPatchplanAsPDF, downloadCSV, exportPatchplanCSV } from "@/lib/exportUtils";
import { printPatchplan } from "@/lib/printUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";

export default function DMXPatchplan() {
  const { allItems, loading } = useInventory();
  const {
    patchplan,
    conflicts,
    universeUsage,
    updateItemDMXAddress,
    updateItemDMXUniverse,
    updateInstanceDMX,
    resetInstanceDMX,
    autoAssignNextAvailable,
  } = useDMXPatchplan();
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('timeline');
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [fakeLoading, setFakeLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setFakeLoading(false), 500);
    return () => clearTimeout(timeout);
  }, []);

  if (loading || fakeLoading) {
    return (
      <div className="space-y-6">
        {/* Universe Usage Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>

        {/* Konflikt-Warnung Skeleton */}
        <Skeleton className="h-20 w-full rounded-lg" />

        {/* Timeline/Table Skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-lg" />
        ))}
      </div>
    );
  }



  const handleExportCSV = () => {
    const csv = exportPatchplanCSV(patchplan);
    downloadCSV(csv, `dmx-patchplan-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "Export erfolgreich", description: "CSV-Datei wurde heruntergeladen." });
  };

  const handleExportPDF = () => {
    exportPatchplanAsPDF(patchplan);
    toast({ title: "Export erfolgreich", description: "PDF-Datei wurde heruntergeladen." });
  };

  const handlePrint = () => {
    printPatchplan(patchplan, conflicts);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="DMX Patchplan"
        description={`${patchplan.length} Kanal-Zuweisungen aus ${allItems.filter(i => i.dmx_start_address && i.dmx_channels).length} Geräten`}
        icon={Sliders}
        actions={
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
            {!isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={patchplan.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    Als CSV exportieren
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Als PDF exportieren
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Drucken
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          }
      />

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
          onInstanceChange={updateInstanceDMX}
          onResetInstance={resetInstanceDMX}
        />
      ) : (
        <DMXPatchplanTable
          rows={patchplan}
          conflicts={conflicts}
          onInstanceChange={updateInstanceDMX}
          onAutoAssign={autoAssignNextAvailable}
          loading={loading}
        />
      )}
    </div>
  );
}
