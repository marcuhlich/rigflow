import { useState, useEffect } from 'react';
import {
  Sliders, LayoutGrid, List, AlertTriangle, Info,
  Download, FileText, Printer,
} from 'lucide-react';
import { Button }            from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge }             from '@/components/ui/badge';
import { Skeleton }          from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn }                from '@/lib/utils';
import { DMXTimeline }       from '@/components/DMXTimeline';
import { DMXPatchplanTable } from '@/components/DMXPatchplanTable';
import { useProjectDMXPatchplan } from '@/hooks/useProjectDMXPatchplan';
import { EnrichedProjectItem }    from '@/hooks/useProjectDetail';
import { exportPatchplanAsPDF, downloadCSV, exportPatchplanCSV } from '@/lib/exportUtils';
import { printPatchplan }         from '@/lib/printUtils';
import { useIsMobile }            from '@/hooks/use-mobile';
import { useToast }               from '@/hooks/use-toast';

// ── Animierter Progress-Balken (identisch zu DMXPatchplan.tsx) ───────────────
function AnimatedBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setTimeout(() => setWidth(Math.min((value / max) * 100, 100)), 50);
    });
    return () => cancelAnimationFrame(raf);
  }, [value, max]);

  const pct = value / max;
  const colorClass =
    pct > 0.9 ? 'bg-destructive' :
    pct > 0.7 ? 'bg-amber-400'   :
    'bg-primary';

  return (
    <div className={cn('h-1.5 bg-muted rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full', colorClass)}
        style={{
          width: `${width}%`,
          transition: 'width 700ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
interface ProjectDMXTabProps {
  projectId:   string;
  projectName: string;
  allItems:    EnrichedProjectItem[];
  isReadonly?: boolean;
}

export function ProjectDMXTab({
  projectId, projectName, allItems, isReadonly = false,
}: ProjectDMXTabProps) {
  const [viewMode,      setViewMode]      = useState<'timeline' | 'table'>('timeline');
  const [hoveredRowId,  setHoveredRowId]  = useState<string | null>(null);
  const [contentVisible, setContentVisible] = useState(true);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const {
    patchplan, conflicts, universeUsage, loading,
    projectInventoryItems,
    updateInstanceDMX, resetInstanceDMX, autoAssignNextAvailable,
  } = useProjectDMXPatchplan(projectId, allItems);

  // ── View-Toggle mit Fade ──────────────────────────────────────────────────
  const handleViewChange = (next: 'timeline' | 'table') => {
    if (next === viewMode) return;
    setContentVisible(false);
    setTimeout(() => {
      setViewMode(next);
      setContentVisible(true);
    }, 150);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const csv = exportPatchplanCSV(patchplan);
    downloadCSV(csv, `dmx-${projectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: 'CSV exportiert' });
  };
  const handleExportPDF = () => {
    exportPatchplanAsPDF(patchplan);
    toast({ title: 'PDF exportiert' });
  };
  const handlePrint = () => printPatchplan(patchplan, conflicts);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const dmxItemCount  = projectInventoryItems.filter(i => i.dmx_start_address && i.dmx_channels).length;
  const universeCount = Object.keys(universeUsage).length;
  const instanceCount = patchplan.length;
  const deviceCount   = new Set(patchplan.map(r => r.itemId)).size;

  // ── Leer-State ────────────────────────────────────────────────────────────
  if (patchplan.length === 0) {
    return (
      <Card
        className="border-dashed"
        style={{ animation: 'dmxTabCardIn 0.35s ease both' }}
      >
        <CardContent className="flex flex-col items-center justify-center py-14 text-center gap-2">
          <div className="p-4 rounded-full bg-muted/30 border border-border/40">
            <Sliders className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium mt-1">Keine DMX-Geräte im Projekt</p>
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            Füge Lichttechnik- oder Effektgeräte mit konfigurierter Kanal-Anzahl zum
            Projekt hinzu. Die Start-Adresse kann hier pro Projekt frei vergeben werden.
          </p>
          {allItems.length > 0 && dmxItemCount === 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border/50 rounded-md px-3 py-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {allItems.length} Artikel im Projekt — keiner mit DMX-Konfiguration
            </div>
          )}
        </CardContent>
        <style>{`
          @keyframes dmxTabCardIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full overflow-x-hidden">
      <style>{`
        @keyframes dmxTabCardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Stats + Controls ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            <Badge key="dev" variant="outline" className="text-[11px] gap-1">
              <Sliders className="h-3 w-3" />
              {deviceCount} Gerät{deviceCount !== 1 ? 'e' : ''}
            </Badge>,
            <Badge key="inst" variant="outline" className="text-[11px]">
              {instanceCount} Instanz{instanceCount !== 1 ? 'en' : ''}
            </Badge>,
            <Badge key="uni" variant="outline" className="text-[11px]">
              {universeCount} Universe{universeCount !== 1 ? 'n' : ''}
            </Badge>,
            conflicts.length > 0 && (
              <Badge key="conf" variant="destructive" className="text-[11px] gap-1">
                <AlertTriangle className="h-3 w-3" />
                {conflicts.length} Konflikt{conflicts.length !== 1 ? 'e' : ''}
              </Badge>
            ),
          ]}
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* View-Toggle */}
          <div className="flex rounded-md border border-border overflow-hidden h-9">
            {(['timeline', 'table'] as const).map((mode, idx) => (
              <button
                key={mode}
                onClick={() => handleViewChange(mode)}
                className={cn(
                  'px-2.5 flex items-center transition-all duration-150 active:scale-95',
                  idx > 0 && 'border-l border-border',
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/50'
                )}
                title={mode === 'timeline' ? 'Timeline-Ansicht' : 'Tabellenansicht'}
              >
                {mode === 'timeline'
                  ? <LayoutGrid className="h-4 w-4" />
                  : <List className="h-4 w-4" />}
              </button>
            ))}
          </div>

          {/* Export */}
          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 active:scale-95 transition-transform"
                  disabled={patchplan.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4 mr-2" /> Als CSV exportieren
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" /> Als PDF exportieren
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" /> Drucken
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── Universe-Auslastung ──────────────────────────────────────────── */}
      <div className={cn('grid gap-3', universeCount === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4')}>
        {Object.entries(universeUsage).map(([universe, usedChannels], idx) => (
          <div
            key={universe}
            className="rounded-lg border border-border/60 bg-card p-3"
            style={{
              animation: 'dmxTabCardIn 0.35s ease both',
              animationDelay: `${idx * 60}ms`,
            }}
          >
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Universe {universe}
            </div>
            <AnimatedBar value={usedChannels} max={512} />
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-muted-foreground">{usedChannels}/512</span>
              <span className="text-[10px] text-muted-foreground">
                {Math.round((usedChannels / 512) * 100)} %
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Konflikte ────────────────────────────────────────────────────── */}
      {conflicts.length > 0 && (
        <Alert
          variant="destructive"
          className="border-destructive/50"
          style={{ animation: 'dmxTabCardIn 0.3s ease both' }}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>DMX-Adresskonflikte im Projekt</AlertTitle>
          <AlertDescription className="mt-1.5">
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {conflicts.slice(0, 4).map((c, i) => (
                <li key={i}>
                  <strong>{c.row1.itemName}</strong>
                  {c.row1.totalInstances > 1 && ` #${c.row1.instanceNumber}`}
                  {' '}({c.row1.startAddress}–{c.row1.endAddress}) ↔{' '}
                  <strong>{c.row2.itemName}</strong>
                  {c.row2.totalInstances > 1 && ` #${c.row2.instanceNumber}`}
                  {' '}({c.row2.startAddress}–{c.row2.endAddress})
                </li>
              ))}
              {conflicts.length > 4 && (
                <li className="text-muted-foreground/80">… und {conflicts.length - 4} weitere</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Readonly-Hinweis ─────────────────────────────────────────────── */}
      {isReadonly && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          Archiviertes Projekt — DMX-Konfiguration ist schreibgeschützt.
        </div>
      )}

      {/* ── Hauptinhalt mit Fade beim View-Wechsel ───────────────────────── */}
      <div
        style={{
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 150ms ease, transform 150ms ease',
        }}
      >
        {viewMode === 'timeline' ? (
          <DMXTimeline
            rows={patchplan}
            conflicts={conflicts}
            hoveredRowId={hoveredRowId}
            onRowHover={row => setHoveredRowId(row?.id ?? null)}
            onInstanceChange={isReadonly ? undefined : updateInstanceDMX}
            onResetInstance={isReadonly ? undefined : resetInstanceDMX}
          />
        ) : (
          <DMXPatchplanTable
            rows={patchplan}
            conflicts={conflicts}
            onInstanceChange={isReadonly ? undefined : updateInstanceDMX}
            onAutoAssign={isReadonly ? undefined : autoAssignNextAvailable}
          />
        )}
      </div>

      {/* ── Isolations-Hinweis ───────────────────────────────────────────── */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          DMX-Adressen hier sind{' '}
          <strong className="text-foreground">nur für dieses Projekt</strong> gültig
        </span>
      </div>
    </div>
  );
}