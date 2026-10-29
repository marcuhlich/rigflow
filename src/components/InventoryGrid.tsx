import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { InventoryContextMenu } from "@/components/InventoryContextMenu";
import { ItemActionsMenu } from "@/components/inventory/ItemActionsMenu";
import { ItemTags } from "@/components/inventory/ItemTags";
import { useLongPress } from "@/components/inventory/useLongPress";
import {
  formatDmx, formatShortDate, useCategoryLabel,
  type CategoryRef, type ItemDraft, type ItemUpdate,
} from "@/components/inventory/format";
import { InventoryItem } from "@/types/inventory";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";

interface InventoryGridProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  selectionMode?: boolean;
  onUpdateItem: (id: string, updates: ItemUpdate) => Promise<void>;
  onAddItem: (item: ItemDraft) => Promise<unknown>;
  onFilterCategory: (category: string) => void;
  onEnterSelectionMode?: (firstItemId: string) => void;
  categories?: CategoryRef[];
  projects?: Project[];
}

const EMPTY_SET = new Set<string>();

/** Card grid: flat tiles with image, status and technical meta. */
export const InventoryGrid = React.memo(function InventoryGrid({
  items,
  onEdit,
  onDelete,
  onViewDetails,
  selectedIds = EMPTY_SET,
  onToggleSelection,
  selectionMode = false,
  onUpdateItem,
  onAddItem,
  onFilterCategory,
  onEnterSelectionMode,
  categories,
  projects,
}: InventoryGridProps) {
  const { t, i18n } = useTranslation();
  const categoryLabel = useCategoryLabel(categories);
  const [qrItemId, setQrItemId] = useState<string | null>(null);
  const { bind, consumeLongPress } = useLongPress((id) => onEnterSelectionMode?.(id), selectionMode);

  const qrItem = qrItemId ? items.find((i) => i.id === qrItemId) : undefined;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const showCheckbox = selectionMode || isSelected;
          const dmx = formatDmx(item);
          const lentUntil = formatShortDate(item.lent_until, i18n.language);

          return (
            <InventoryContextMenu
              key={item.id}
              item={item}
              onUpdateItem={onUpdateItem}
              onAddItem={onAddItem}
              onFilterCategory={onFilterCategory}
              projects={projects}
            >
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "surface group flex cursor-pointer select-none flex-col overflow-hidden text-left transition-colors",
                  "hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected && "border-primary/60 bg-primary/[0.04] hover:border-primary/60"
                )}
                {...bind(item.id)}
                onClick={() => {
                  if (consumeLongPress()) return;
                  if (selectionMode) onToggleSelection?.(item.id);
                  else onViewDetails?.(item.id);
                }}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter") onViewDetails?.(item.id);
                  if (e.key === " ") { e.preventDefault(); onToggleSelection?.(item.id); }
                }}
              >
                {item.image_url && (
                  <div className="aspect-[16/9] w-full border-b border-border bg-surface-sunken">
                    <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                )}

                <div className="flex flex-1 flex-col gap-2.5 p-3.5">
                  <div className="flex items-start gap-2.5">
                    {showCheckbox && (
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleSelection?.(item.id); }}
                        aria-label={t("inventory.select_item_aria", { name: item.name })}
                        className="mt-0.5"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium leading-5">{item.name}</h3>
                      <p className="truncate text-xs text-muted-foreground">{categoryLabel(item.category)}</p>
                    </div>
                    {!selectionMode && (
                      <div onClick={(e) => e.stopPropagation()} className="-mr-1.5 -mt-1">
                        <ItemActionsMenu
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 max-lg:opacity-100"
                          onShowQr={() => setQrItemId(item.id)}
                          onEdit={() => onEdit(item)}
                          onDelete={() => onDelete(item.id)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge condition={item.condition} />
                    {item.condition === "verliehen" && item.lent_to && (
                      <span className="min-w-0 truncate text-xs text-muted-foreground">
                        {item.lent_to}
                        {lentUntil && <> · {t("inventory_grid.lent_until")} <span className="tech">{lentUntil}</span></>}
                      </span>
                    )}
                  </div>

                  <dl className="mt-auto grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-border pt-2.5 text-xs">
                    <dt className="text-muted-foreground">{t("fields.location")}</dt>
                    <dd className="truncate text-right">{item.location || "—"}</dd>
                    <dt className="text-muted-foreground">{t("fields.quantity")}</dt>
                    <dd className="text-right font-mono tabular-nums">{item.quantity}</dd>
                    {dmx && (
                      <>
                        <dt className="text-muted-foreground">{t("fields.dmx_address")}</dt>
                        <dd className="text-right font-mono tabular-nums">{dmx}</dd>
                      </>
                    )}
                  </dl>

                  {item.tags?.length > 0 && <ItemTags tags={item.tags} max={4} className="flex-wrap" />}
                </div>
              </div>
            </InventoryContextMenu>
          );
        })}
      </div>

      {qrItem && (
        <QRCodeDisplay
          isOpen
          onClose={() => setQrItemId(null)}
          itemId={qrItem.id}
          itemName={qrItem.name}
          itemDetails={{
            category: qrItem.category,
            quantity: qrItem.quantity,
            location: qrItem.location,
          }}
          size="md"
        />
      )}
    </>
  );
});
