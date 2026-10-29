import { memo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { ItemThumb } from "@/components/inventory/ItemThumb";
import { useLongPress } from "@/components/inventory/useLongPress";
import { formatDmx, useCategoryLabel, type CategoryRef } from "@/components/inventory/format";
import type { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface InventoryMobileListProps {
  items: InventoryItem[];
  selectedIds: Set<string>;
  selectionMode: boolean;
  onToggleSelection: (id: string) => void;
  onViewDetails: (id: string) => void;
  onEnterSelectionMode: (firstItemId: string) => void;
  categories?: CategoryRef[];
}

/** Phone layout: one dense row per item. Tap opens, long press starts multi-select. */
export const InventoryMobileList = memo(function InventoryMobileList({
  items,
  selectedIds,
  selectionMode,
  onToggleSelection,
  onViewDetails,
  onEnterSelectionMode,
  categories,
}: InventoryMobileListProps) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel(categories);
  const { bind, consumeLongPress } = useLongPress(onEnterSelectionMode, selectionMode);

  return (
    <ul className="surface divide-y divide-border overflow-hidden">
      {items.map((item) => {
        const isSelected = selectedIds.has(item.id);
        const dmx = formatDmx(item);
        const secondary = [categoryLabel(item.category), item.location].filter(Boolean).join(" · ");

        return (
          <li key={item.id}>
            <button
              type="button"
              {...bind(item.id)}
              onClick={() => {
                if (consumeLongPress()) return;
                if (selectionMode) onToggleSelection(item.id);
                else onViewDetails(item.id);
              }}
              aria-pressed={selectionMode ? isSelected : undefined}
              className={cn(
                "flex w-full select-none items-center gap-3 px-3 py-2.5 text-left transition-colors active:bg-muted",
                isSelected && "bg-primary/[0.06]"
              )}
            >
              {selectionMode ? (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <Checkbox
                    checked={isSelected}
                    tabIndex={-1}
                    aria-label={t("inventory.select_item_aria", { name: item.name })}
                    className="pointer-events-none h-5 w-5"
                  />
                </span>
              ) : (
                <ItemThumb src={item.image_url} alt="" className="h-10 w-10" />
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium leading-5">{item.name}</span>
                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {item.condition === "verliehen" && item.lent_to ? (
                    <span className="truncate text-warning">{item.lent_to}</span>
                  ) : (
                    <span className="truncate">{secondary}</span>
                  )}
                  {dmx && <span className="tech shrink-0">{dmx}</span>}
                </span>
              </span>

              <span className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge condition={item.condition} />
                <span className="font-mono text-xs tabular-nums text-muted-foreground">×{item.quantity}</span>
              </span>

              {!selectionMode && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
});
