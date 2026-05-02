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

// ── Animierter Progress-Balken ────────────────────────────────────────────────
// Läuft von 0 → Zielwert ein, sobald er sichtbar wird.
function AnimatedBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Einen Frame warten damit der initiale 0%-Zustand gerendert wird,
    // dann auf den echten Wert animieren.
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
  const { allItems, loading } = useInventory();
  const {
    patchplan, conflicts, universeUsage,
    updateItemDMXAddress, updateItemDMXUniverse,
    updateInstanceDMX, resetInstanceDMX, autoAssignNextAvailable,
  } = useDMXPatchplan();

  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  // Steuert ob der Content-Bereich gerade zwischen den Views übergeblendet wird
  const [contentVisible, setContentVisible] = useState(true);
  const [setFakeLoading] = useState(true);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ── View-Toggle mit Fade-Übergang ─────────────────────────────────────────
  const handleViewChange = (next: "timeline" | "table") => {
    if (next === viewMode) return;
    // 1. Ausblenden
    setContentVisible(false);
    // 2. Nach der Fade-out-Dauer (150ms) tatsächlich umschalten + einblenden
    setTimeout(() => {
      setViewMode(next);
      setContentVisible(true);
    }, 150);
  };

  // ── Export-Handler ────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const csv = exportPatchplanCSV(patchplan);
    downloadCSV(csv, `dmx-patchplan-${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: "Export erfolgreich", description: "CSV-Datei wurde heruntergeladen." });
  };
  const handleExportPDF = () => {
    exportPatchplanAsPDF(patchplan);
    toast({ title: "Export erfolgreich", description: "PDF-Datei wurde heruntergeladen." });
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
        title="DMX Patchplan"
        description={`${patchplan.length} Kanal-Zuweisungen aus ${
          allItems.filter(i => i.dmx_start_address && i.dmx_channels).length
        } Geräten`}
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
                  title={mode === "timeline" ? "Timeline-Ansicht" : "Tabellenansicht"}
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
                // Stagger: jede Karte kommt leicht versetzt rein
                animation: "dmxCardIn 0.35s ease both",
                animationDelay: `${idx * 60}ms`,
              }}
            >
              <div className="text-sm font-medium text-muted-foreground">
                Universe {universe}
              </div>
              <div className="mt-2 space-y-1">
                <AnimatedBar value={usedChannels} max={512} />
                <div className="text-xs text-muted-foreground">
                  {usedChannels}/512 Kanäle
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
          <AlertTitle>DMX-Adresskonflikte erkannt!</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm">
              {conflicts.slice(0, 5).map((conflict, i) => (
                <li key={i}>
                  <strong>{conflict.row1.itemName}</strong> #{conflict.row1.instanceNumber}{" "}
                  ({conflict.row1.startAddress}–{conflict.row1.endAddress}) überschneidet sich mit{" "}
                  <strong>{conflict.row2.itemName}</strong> #{conflict.row2.instanceNumber}{" "}
                  ({conflict.row2.startAddress}–{conflict.row2.endAddress})
                </li>
              ))}
              {conflicts.length > 5 && (
                <li className="text-muted-foreground">… und {conflicts.length - 5} weitere</li>
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
            <h3 className="text-base font-medium">Keine DMX-Geräte gefunden</h3>
            <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
              Füge DMX-Adressen und Kanalanzahl zu deinen Lichttechnik- oder Effektgeräten hinzu.
            </p>
          </div>
          {/* CTA direkt zum Inventar */}
          <Button
            variant="outline"
            className="gap-1.5 active:scale-95 transition-transform"
            onClick={() => navigate("/inventory?category=Lichttechnik")}
          >
            <Plus className="h-4 w-4" />
            Zum Inventar
          </Button>
        </div>
      ) : (
        /* Fade + leichtes Y-Shift beim View-Wechsel */
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

      {/* ── Keyframes ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes dmxCardIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}