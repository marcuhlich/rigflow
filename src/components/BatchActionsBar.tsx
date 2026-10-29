import { useState } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ItemCondition, CONDITIONS } from "@/types/inventory";
import { getConditionLabel } from "@/i18n/helpers";
import { cn } from "@/lib/utils";

interface BatchActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBatchUpdateCondition: (condition: ItemCondition) => void | Promise<void>;
  onBatchUpdateLocation: (location: string) => void | Promise<void>;
  onBatchDelete: () => void | Promise<void>;
  locations: string[];
  isProcessing: boolean;
  /** Total number of selectable rows; enables the "select all" shortcut. */
  totalCount?: number;
  onSelectAll?: () => void;
  /** Keep the bar visible with zero selected (explicit selection mode on touch). */
  forceVisible?: boolean;
}

/** Floating action bar for multi-selection. Sits above the mobile tab bar, centred in the content area on desktop. */
export function BatchActionsBar({
  selectedCount, onClearSelection, onBatchUpdateCondition,
  onBatchUpdateLocation, onBatchDelete, locations, isProcessing,
  totalCount, onSelectAll, forceVisible = false,
}: BatchActionsBarProps) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Controlled values so the selects reset after every action.
  const [selectKey, setSelectKey] = useState(0);

  if (selectedCount === 0 && !forceVisible) return null;

  const none = selectedCount === 0;
  const disabled = isProcessing || none;
  const canSelectAll = !!onSelectAll && totalCount != null && selectedCount < totalCount;

  const run = (fn: () => void | Promise<void>) => {
    setSelectKey((k) => k + 1);
    void Promise.resolve(fn()).catch(() => { /* errors are surfaced by useInventory */ });
  };

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 z-40 px-3",
          "bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.5rem)] lg:bottom-6 lg:pl-[calc(15rem+2rem)] lg:pr-8"
        )}
      >
        <div
          role="toolbar"
          aria-label={t("batch.selected_count", { count: selectedCount })}
          className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-2 rounded-lg border border-border-strong bg-popover p-2 text-popover-foreground shadow-lg sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              aria-label={t("inventory.clear_selection")}
              className="h-8 w-8 shrink-0"
            >
              <X />
            </Button>
            <span className="whitespace-nowrap px-1 text-[13px] font-medium tabular-nums">
              {t("batch.selected_count", { count: selectedCount })}
            </span>
            {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {canSelectAll && (
              <Button variant="link" size="sm" className="ml-auto h-8 px-2 text-[13px] sm:ml-1" onClick={onSelectAll}>
                {t("inventory.select_all_count", { count: totalCount })}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:ml-auto sm:flex sm:items-center">
            <Select
              key={`c${selectKey}`}
              onValueChange={(v) => run(() => onBatchUpdateCondition(v as ItemCondition))}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 min-w-0 text-[13px] sm:w-[150px]">
                <SelectValue placeholder={t("batch.change_status")} />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>{getConditionLabel(c, t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              key={`l${selectKey}`}
              onValueChange={(v) => run(() => onBatchUpdateLocation(v))}
              disabled={disabled || locations.length === 0}
            >
              <SelectTrigger className="h-8 min-w-0 text-[13px] sm:w-[150px]">
                <SelectValue placeholder={t("batch.location")} />
              </SelectTrigger>
              <SelectContent>
                {locations.filter(Boolean).map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={disabled}
              aria-label={t("common.delete")}
              className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
              <span className="hidden sm:inline">{t("common.delete")}</span>
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("inventory.batch_trash_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("inventory.batch_trash_description", { count: selectedCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowDeleteConfirm(false); run(onBatchDelete); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
