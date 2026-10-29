import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, FileText, Printer, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { EmptyPanel, ListSkeleton } from "@/components/QueryState";
import { DMXTimeline } from "@/components/DMXTimeline";
import { DMXPatchplanTable } from "@/components/DMXPatchplanTable";
import { UniverseSummary } from "@/components/dmx/UniverseSummary";
import { ConflictPanel } from "@/components/dmx/ConflictPanel";
import { ViewToggle, type DMXViewMode } from "@/components/dmx/ViewToggle";
import { useInventory } from "@/hooks/useInventory";
import { useDMXPatchplan } from "@/hooks/useDMXPatchplan";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { exportPatchplanAsPDF, downloadCSV, exportPatchplanCSV } from "@/lib/exportUtils";
import { printPatchplan } from "@/lib/printUtils";
import { logger } from "@/lib/logger";

export default function DMXPatchplan() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { allItems, loading } = useInventory();
  const { patchplan, conflicts, updateInstanceDMX, resetInstanceDMX, autoAssignNextAvailable } = useDMXPatchplan();

  const [viewMode, setViewMode] = useState<DMXViewMode>("timeline");
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const deviceCount = useMemo(() => allItems.filter((i) => i.dmx_start_address && i.dmx_channels).length, [allItems]);

  const runExport = (fn: () => void, successKey: string) => {
    try {
      fn();
      toast({ title: t("dmx_patchplan.export_success"), description: t(successKey) });
    } catch (err) {
      logger.error("DMXPatchplan", "Export failed", err);
      toast({ title: t("common.error"), description: t("common.unknown_error"), variant: "destructive" });
    }
  };

  const handleExportCSV = () =>
    runExport(() => {
      const csv = exportPatchplanCSV(patchplan);
      downloadCSV(csv, `dmx-patchplan-${new Date().toISOString().split("T")[0]}.csv`);
    }, "dmx_patchplan.export_csv_downloaded");

  const handleExportPDF = () => runExport(() => exportPatchplanAsPDF(patchplan), "dmx_patchplan.export_pdf_downloaded");

  const handlePrint = () => {
    try {
      printPatchplan(patchplan, conflicts);
    } catch (err) {
      logger.error("DMXPatchplan", "Print failed", err);
    }
  };

  const hasRows = patchplan.length > 0;

  const header = (
    <PageHeader
      title={t("dmx_patchplan.title")}
      description={t("dmx_patchplan.description", { assignments: patchplan.length, devices: deviceCount })}
      actions={
        hasRows && (
          <>
            <ViewToggle value={viewMode} onChange={setViewMode} />
            {!isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download />
                    {t("common.export")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="mr-2 h-4 w-4" /> {t("dmx.export_csv")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="mr-2 h-4 w-4" /> {t("dmx.export_pdf")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> {t("common.print")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )
      }
    />
  );

  if (loading && allItems.length === 0) {
    return (
      <>
        {header}
        <ListSkeleton rows={6} />
      </>
    );
  }

  if (!hasRows) {
    return (
      <>
        {header}
        <EmptyPanel
          icon={Sliders}
          title={t("dmx_patchplan.empty_title")}
          description={t("dmx_patchplan.empty_description")}
          action={
            <Button variant="outline" asChild>
              <Link to="/inventory?category=licht">{t("dmx_patchplan.empty_cta")}</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      <div className="space-y-4">
        <UniverseSummary rows={patchplan} conflicts={conflicts} />
        <ConflictPanel conflicts={conflicts} onHover={(row) => setHoveredRowId(row?.id ?? null)} />

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
    </>
  );
}
