import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useGoogleSheets } from "@/hooks/useGoogleSheets";
import { exportInventoryAsCSV, exportInventoryAsPDF, downloadCSV } from "@/lib/exportUtils";
import { printInventory } from "@/lib/printUtils";
import { getConditionLabel } from "@/i18n/helpers";
import type { InventoryItem } from "@/types/inventory";

/** CSV / PDF / Google Sheets / print exports for the currently visible items. */
export function useInventoryExports(items: InventoryItem[]) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { exportToSheets, isExporting } = useGoogleSheets();

  const success = (description: string) =>
    toast({ title: t("inventory.export_success_title"), description });

  const exportCSV = () => {
    downloadCSV(exportInventoryAsCSV(items), `inventar-${new Date().toISOString().split("T")[0]}.csv`);
    success(t("inventory.export_csv_description"));
  };

  const exportPDF = () => {
    exportInventoryAsPDF(items);
    success(t("inventory.export_pdf_description"));
  };

  const print = () => printInventory(items);

  const exportSheets = async () => {
    try {
      await exportToSheets(
        items.map((i) => ({
          name: i.name,
          category: i.category,
          quantity: i.quantity,
          status: getConditionLabel(i.condition, t),
          location: i.location,
          notes: i.notes ?? "",
        }))
      );
      success(t("inventory.export_sheets_description"));
    } catch {
      toast({
        title: t("inventory.export_failed_title"),
        description: t("inventory.export_failed_description"),
        variant: "destructive",
      });
    }
  };

  return { exportCSV, exportPDF, exportSheets, print, isExporting };
}
