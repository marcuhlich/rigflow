import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Download, FileText, Info, LayoutGrid, List, Lock, Printer, Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyPanel, ListSkeleton } from '@/components/QueryState';
import { cn } from '@/lib/utils';
import { DMXTimeline } from '@/components/DMXTimeline';
import { DMXPatchplanTable } from '@/components/DMXPatchplanTable';
import { useProjectDMXPatchplan } from '@/hooks/useProjectDMXPatchplan';
import type { EnrichedProjectItem } from '@/hooks/useProjectDetail';
import { exportPatchplanAsPDF, downloadCSV, exportPatchplanCSV } from '@/lib/exportUtils';
import { printPatchplan } from '@/lib/printUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';

const DMX_UNIVERSE_SIZE = 512;
const CONFLICT_PREVIEW = 4;

type ViewMode = 'timeline' | 'table';

function UniverseMeter({ universe, used }: { universe: string; used: number }) {
  const { t } = useTranslation();
  const pct = Math.min(100, Math.round((used / DMX_UNIVERSE_SIZE) * 100));
  const tone = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-warning' : 'bg-foreground/70';
  return (
    <div className="surface px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{t('dmx.universe_number', { number: universe })}</span>
        <span className="font-mono text-xs tabular-nums">
          {used}<span className="text-muted-foreground">/{DMX_UNIVERSE_SIZE}</span>
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-[width] duration-200', tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-card px-3 py-2.5">
      <p className={cn('font-mono text-lg font-semibold tabular-nums leading-none', tone)}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

interface ProjectDMXTabProps {
  projectId:   string;
  projectName: string;
  allItems:    EnrichedProjectItem[];
  isReadonly?: boolean;
}

export function ProjectDMXTab({ projectId, projectName, allItems, isReadonly = false }: ProjectDMXTabProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const {
    patchplan, conflicts, universeUsage, loading, projectInventoryItems,
    updateInstanceDMX, resetInstanceDMX, autoAssignNextAvailable,
  } = useProjectDMXPatchplan(projectId, allItems);

  const handleExportCSV = () => {
    const slug = projectName.trim().replace(/\s+/g, '-').toLowerCase() || 'project';
    downloadCSV(exportPatchplanCSV(patchplan), `dmx-${slug}-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: t('dmx.export_csv_success') });
  };
  const handleExportPDF = () => {
    exportPatchplanAsPDF(patchplan);
    toast({ title: t('dmx.export_pdf_success') });
  };
  const handlePrint = () => printPatchplan(patchplan, conflicts);

  if (loading) return <ListSkeleton rows={4} />;

  if (patchplan.length === 0) {
    const dmxItemCount = projectInventoryItems.filter(i => i.dmx_start_address && i.dmx_channels).length;
    return (
      <EmptyPanel
        icon={Sliders}
        title={t('dmx.empty_title')}
        description={
          <>
            {t('dmx.empty_description')}
            {allItems.length > 0 && dmxItemCount === 0 && (
              <span className="mt-2 block">{t('dmx.empty_hint', { count: allItems.length })}</span>
            )}
          </>
        }
      />
    );
  }

  const universes = Object.entries(universeUsage);
  const deviceCount = new Set(patchplan.map(r => r.itemId)).size;

  return (
    <div className="w-full space-y-3">
      {/* Summary */}
      <div className="surface grid grid-cols-2 gap-px overflow-hidden bg-border sm:grid-cols-4">
        <Stat label={t('project_detail.dmx.stat_devices')} value={deviceCount} />
        <Stat label={t('project_detail.dmx.stat_instances')} value={patchplan.length} />
        <Stat label={t('project_detail.dmx.stat_universes')} value={universes.length} />
        <Stat
          label={t('project_detail.dmx.stat_conflicts')}
          value={conflicts.length}
          tone={conflicts.length > 0 ? 'text-destructive' : 'text-muted-foreground'}
        />
      </div>

      {/* Universe usage */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {universes.map(([universe, used]) => (
          <UniverseMeter key={universe} universe={universe} used={used} />
        ))}
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="surface border-destructive/30 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t('dmx.conflicts_title')}
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {conflicts.slice(0, CONFLICT_PREVIEW).map(c => (
              <li key={`${c.row1.id}-${c.row2.id}`} className="flex flex-wrap items-center gap-x-1.5">
                <span className="font-medium">{c.row1.itemName}{c.row1.totalInstances > 1 && ` #${c.row1.instanceNumber}`}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{c.row1.startAddress}–{c.row1.endAddress}</span>
                <span className="text-muted-foreground">↔</span>
                <span className="font-medium">{c.row2.itemName}{c.row2.totalInstances > 1 && ` #${c.row2.instanceNumber}`}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{c.row2.startAddress}–{c.row2.endAddress}</span>
              </li>
            ))}
            {conflicts.length > CONFLICT_PREVIEW && (
              <li className="text-muted-foreground">{t('dmx.conflicts_more', { count: conflicts.length - CONFLICT_PREVIEW })}</li>
            )}
          </ul>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {isReadonly ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            {t('dmx.readonly_hint')}
          </p>
        ) : <span />}
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={v => { if (v) setViewMode(v as ViewMode); }}
            className="rounded-md border border-border p-0.5"
          >
            <ToggleGroupItem value="timeline" size="sm" className="h-7 w-8 px-0" aria-label={t('dmx.view_timeline')}>
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" size="sm" className="h-7 w-8 px-0" aria-label={t('dmx.view_table')}>
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download />
                  {t('common.export')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={handleExportCSV} className="gap-2">
                  <FileText className="h-4 w-4" /> {t('dmx.export_csv')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleExportPDF} className="gap-2">
                  <FileText className="h-4 w-4" /> {t('dmx.export_pdf')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handlePrint} className="gap-2">
                  <Printer className="h-4 w-4" /> {t('common.print')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
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
        <div className="overflow-x-auto rounded-lg [-webkit-overflow-scrolling:touch]">
          <DMXPatchplanTable
            rows={patchplan}
            conflicts={conflicts}
            onInstanceChange={isReadonly ? undefined : updateInstanceDMX}
            onAutoAssign={isReadonly ? undefined : autoAssignNextAvailable}
          />
        </div>
      )}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span dangerouslySetInnerHTML={{ __html: t('dmx.isolation_hint') }} />
      </p>
    </div>
  );
}
