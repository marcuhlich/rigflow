import {
  CheckSquare, Download, FileSpreadsheet, FileText, LayoutGrid,
  Plus, Printer, Rows3, Sheet as SheetIcon, Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "table";

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/** Segmented table/grid switch for the toolbar. */
export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  const { t } = useTranslation();
  const options: { mode: ViewMode; icon: React.ElementType; label: string }[] = [
    { mode: "table", icon: Rows3, label: t("inventory.list_view") },
    { mode: "grid", icon: LayoutGrid, label: t("inventory.grid_view") },
  ];
  return (
    <div role="radiogroup" className="inline-flex h-9 items-center rounded-md border border-border bg-background p-0.5">
      {options.map(({ mode, icon: Icon, label }) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(mode)}
            className={cn(
              "flex h-full w-8 items-center justify-center rounded-[4px] transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

interface HeaderActionsProps {
  isMobile: boolean;
  trashedCount: number;
  isExporting: boolean;
  selectionMode: boolean;
  onAdd: () => void;
  onOpenTrash: () => void;
  onToggleSelectionMode: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onExportSheets: () => void;
  onPrint: () => void;
}

/** PageHeader actions: export + trash as secondary, "New item" as the single primary action. */
export function InventoryHeaderActions({
  isMobile, trashedCount, isExporting, selectionMode,
  onAdd, onOpenTrash, onToggleSelectionMode,
  onExportCSV, onExportPDF, onExportSheets, onPrint,
}: HeaderActionsProps) {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <div className="flex w-full items-center gap-2">
        <Button onClick={onAdd} className="flex-1">
          <Plus />
          {t("inventory.new_item")}
        </Button>
        <Button
          variant={selectionMode ? "secondary" : "outline"}
          onClick={onToggleSelectionMode}
          aria-pressed={selectionMode}
        >
          <CheckSquare />
          {selectionMode ? t("inventory.done") : t("inventory.select")}
        </Button>
        <Button variant="outline" size="icon" onClick={onOpenTrash} aria-label={t("trash.title")} className="relative">
          <Trash2 />
          {trashedCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full border border-background bg-muted px-1 font-mono text-[10px] leading-4 tabular-nums text-foreground">
              {trashedCount}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={onOpenTrash}>
        <Trash2 />
        {t("trash.title")}
        {trashedCount > 0 && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{trashedCount}</span>
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download />
            {t("common.export")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={onExportCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-muted-foreground" />
            {t("inventory.export_csv")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onExportPDF}>
            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
            {t("inventory.export_pdf")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onExportSheets} disabled={isExporting}>
            <SheetIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {isExporting ? t("inventory.exporting") : t("inventory.export_sheets")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onPrint}>
            <Printer className="mr-2 h-4 w-4 text-muted-foreground" />
            {t("common.print")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button onClick={onAdd}>
        <Plus />
        {t("inventory.new_item")}
      </Button>
    </>
  );
}
