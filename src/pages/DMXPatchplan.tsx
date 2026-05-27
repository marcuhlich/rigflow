import { useMemo, useState, useEffect, useRef } from "react";
import { AlertTriangle, Sliders, LayoutGrid, List, Download, FileText, Printer, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
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
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

// ── Animierter Progress-Balken ────────────────────────────────────────────────
function AnimatedBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setTimeout(() => setWidth(Math.min((value / max) * 100, 100)), 50);
    });
    return () => cancelAnimationFrame(raf);
  }, [value, max]);

  const colorClass =
    value / max > 0.9
      ? "bg-destructive"
      : value / max > 0.7
      ? "bg-yellow-500"
      : "bg-primary";

  return (
    <div className={cn("h-2 bg-muted rounded-full overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full", colorClass)}
        style={{
          width: `${width}%`,
          transition: "width 700ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}

export default function DMXPatchplan() {
  const { t } = useTranslation();
  const { allItems, loading } = useInventory();
  const {
    patchplan, conflicts, universeUsage,
    updateItemDMXAddress, updateItemDMXUniverse,
    updateInstanceDMX, resetInstanceDMX, autoAssignNextAvailable,
  } = useDMXPatchplan();

  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [contentVisible, setContentVisible] = useState(true);
  const [setFakeLoading] = useState(true);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ── View-Toggle mit Fade-Übergang ─────────────────────────────────────────
  const handleViewChange = (next: "timeline" | "table") => {
    if (next === viewMode) return;
    setContentVisible(false);
    setTimeout(() => {
      setViewMode(next);
      setContentVisible(true);
    }, 150);
  };

  // ── Export-Handler ────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const csv = exportPatchplanCSV(patchplan);
    downloadCSV(csv, `dmx-patchplan-${new Date().toISOString().split("T")[0]}.csv`);
    toast({
      title: t('dmx_patchplan.export_success'),
      description: t('dmx_patchplan.export_csv_downloaded'),
    });
  };
  const handleExportPDF = () => {
    exportPatchplanAsPDF(patchplan);
    toast({
      title: t('dmx_patchplan.export_success'),
      description: t('dmx_patchplan.export_pdf_downloaded'),
    });
  };
  const handlePrint = () => printPatchplan(patchplan, conflicts);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dmx_patchplan.title')}
        description={t('dmx_patchplan.description', {
          assignments: patchplan.length,
          devices: allItems.filter(i => i.dmx_start_address && i.dmx_channels).length,
        })}
        icon={Sliders}
        actions={
          <div className="flex gap-2 flex-wrap">
            {/* View-Toggle */}
            <div className="flex rounded-md border border-border overflow-hidden h-9">
              {(["timeline", "table"] as const).map((mode, idx) => (
                <button
                  key={mode}
                  onClick={() => handleViewChange(mode)}
                  className={cn(
                    "px-2.5 flex items-center transition-all duration-150",
                    "active:scale-95",
                    idx > 0 && "border-l border-border",
                    viewMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                  title={mode === "timeline" ? t('dmx.view_timeline') : t('dmx.view_table')}
                >
                  {mode === "timeline"
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
                    className="gap-2 h-9 active:scale-95 transition-transform"
                    disabled={patchplan.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    {t('common.export')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="h-4 w-4 mr-2" /> {t('dmx.export_csv')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="h-4 w-4 mr-2" /> {t('dmx.export_pdf')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" /> {t('common.print')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />

      {/* ── Universe-Auslastung ─────────────────────────────────────────────── */}
      {Object.keys(universeUsage).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(universeUsage).map(([universe, usedChannels], idx) => (
            <div
              key={universe}
              className="glass-card p-3"
              style={{
                animation: "dmxCardIn 0.35s ease both",
                animationDelay: `${idx * 60}ms`,
              }}
            >
              <div className="text-sm font-medium text-muted-foreground">
                {t('dmx.universe_number', { number: universe })}
              </div>
              <div className="mt-2 space-y-1">
                <AnimatedBar value={usedChannels} max={512} />
                <div className="text-xs text-muted-foreground">
                  {t('dmx_patchplan.channels_used', { used: usedChannels })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Konflikt-Alert ──────────────────────────────────────────────────── */}
      {conflicts.length > 0 && (
        <Alert
          variant="destructive"
          className="glass-card border-destructive/50"
          style={{ animation: "dmxCardIn 0.3s ease both" }}
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('dmx_patchplan.conflicts_title')}</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm">
              {conflicts.slice(0, 5).map((conflict, i) => (
                <li key={i}>
                  <strong>{conflict.row1.itemName}</strong>{" "}
                  #{conflict.row1.instanceNumber}{" "}
                  ({conflict.row1.startAddress}–{conflict.row1.endAddress}){" "}
                  {t('dmx_patchplan.conflicts_overlaps_with')}{" "}
                  <strong>{conflict.row2.itemName}</strong>{" "}
                  #{conflict.row2.instanceNumber}{" "}
                  ({conflict.row2.startAddress}–{conflict.row2.endAddress})
                </li>
              ))}
              {conflicts.length > 5 && (
                <li className="text-muted-foreground">
                  {t('dmx.conflicts_more', { count: conflicts.length - 5 })}
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Hauptinhalt ────────────────────────────────────────────────────── */}
      {patchplan.length === 0 ? (
        <div
          className="glass-card p-12 text-center flex flex-col items-center gap-4"
          style={{ animation: "dmxCardIn 0.4s ease both" }}
        >
          <div className="p-4 rounded-full bg-muted/30 border border-border/40">
            <Sliders className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="max-w-xs">
            <h3 className="text-base font-medium">{t('dmx_patchplan.empty_title')}</h3>
            <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
              {t('dmx_patchplan.empty_description')}
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-1.5 active:scale-95 transition-transform"
            onClick={() => navigate("/inventory?category=Lichttechnik")}
          >
            <Plus className="h-4 w-4" />
            {t('dmx_patchplan.empty_cta')}
          </Button>
        </div>
      ) : (
        <div
          style={{
            opacity: contentVisible ? 1 : 0,
            transform: contentVisible ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 150ms ease, transform 150ms ease",
          }}
        >
          {viewMode === "timeline" ? (
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
      )}

      <style>{`
        @keyframes dmxCardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}