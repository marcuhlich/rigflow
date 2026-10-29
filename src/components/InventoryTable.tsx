import React, { useCallback, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { InventoryContextMenu } from "@/components/InventoryContextMenu";
import { ItemActionsMenu } from "@/components/inventory/ItemActionsMenu";
import { ItemThumb } from "@/components/inventory/ItemThumb";
import { ItemTags } from "@/components/inventory/ItemTags";
import {
  CONDITION_ORDER, formatDmx, formatPrice, useCategoryLabel,
  type CategoryRef, type ItemDraft, type ItemUpdate,
} from "@/components/inventory/format";
import { InventoryItem } from "@/types/inventory";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";

type SortKey = "name" | "category" | "condition" | "location" | "quantity";
type SortState = { key: SortKey; dir: "asc" | "desc" } | null;

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onViewDetails?: (id: string) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  /** When true a row click toggles selection instead of opening the item. */
  selectionMode?: boolean;
  onUpdateItem?: (id: string, updates: ItemUpdate) => Promise<void>;
  onAddItem?: (item: ItemDraft) => Promise<unknown>;
  onFilterCategory?: (category: string) => void;
  categories?: CategoryRef[];
  projects?: Project[];
}

const EMPTY_SET = new Set<string>();
const noopAsync = async () => {};
const noop = () => {};

const TH = "sticky top-0 z-10 h-9 border-b border-border bg-surface-sunken px-3 text-left align-middle text-2xs font-medium uppercase tracking-[0.06em] text-muted-foreground";
const TD = "px-3 py-2 align-middle";

interface SortHeaderProps {
  col: SortKey;
  label: string;
  sort: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
  alignRight?: boolean;
}

function SortHeader({ col, label, sort, onSort, className, alignRight }: SortHeaderProps) {
  const active = sort?.key === col;
  const dir = active ? sort.dir : null;
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <th
      className={cn(TH, alignRight && "text-right", className)}
      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase tracking-[inherit] transition-colors hover:text-foreground",
          active && "text-foreground",
          alignRight && "flex-row-reverse"
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3", !active && "opacity-40")} />
      </button>
    </th>
  );
}

export const InventoryTable = React.memo(function InventoryTable({
  items,
  onEdit,
  onDelete,
  onViewDetails,
  selectedIds = EMPTY_SET,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  selectionMode = false,
  onUpdateItem,
  onAddItem,
  onFilterCategory,
  categories,
  projects,
}: InventoryTableProps) {
  const { t, i18n } = useTranslation();
  const categoryLabel = useCategoryLabel(categories);
  const [qrItemId, setQrItemId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState>(null);
  const lastCheckedIndex = useRef<number | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return items;
    const factor = sort.dir === "asc" ? 1 : -1;
    const collator = new Intl.Collator(i18n.language, { numeric: true, sensitivity: "base" });
    return [...items].sort((a, b) => {
      switch (sort.key) {
        case "quantity":
          return (a.quantity - b.quantity) * factor;
        case "condition":
          return ((CONDITION_ORDER[a.condition] ?? 9) - (CONDITION_ORDER[b.condition] ?? 9)) * factor;
        case "category":
          return collator.compare(categoryLabel(a.category), categoryLabel(b.category)) * factor;
        default:
          return collator.compare(a[sort.key] ?? "", b[sort.key] ?? "") * factor;
      }
    });
  }, [items, sort, i18n.language, categoryLabel]);

  const toggleSort = (key: SortKey) =>
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });

  const allSelected = sorted.length > 0 && sorted.every((i) => selectedIds.has(i.id));

  const handleCheck = useCallback(
    (index: number, shift: boolean) => {
      if (!onToggleSelection) return;
      const last = lastCheckedIndex.current;
      if (shift && last !== null && last !== index) {
        // Range select: bring every row between the anchor and this one to the anchor's state.
        const anchor = sorted[last];
        const target = anchor ? selectedIds.has(anchor.id) : true;
        const [from, to] = last < index ? [last, index] : [index, last];
        for (let i = from; i <= to; i++) {
          const row = sorted[i];
          if (row && selectedIds.has(row.id) !== target) onToggleSelection(row.id);
        }
      } else {
        const row = sorted[index];
        if (row) onToggleSelection(row.id);
      }
      lastCheckedIndex.current = index;
    },
    [onToggleSelection, selectedIds, sorted]
  );

  const qrItem = qrItemId ? items.find((i) => i.id === qrItemId) : undefined;
  const sortProps = { sort, onSort: toggleSort };

  return (
    <>
      <div className="surface overflow-clip">
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <th className={cn(TH, "w-10 pr-0")}>
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => (allSelected ? onClearSelection?.() : onSelectAll?.())}
                  aria-label={t("trash.select_all")}
                  className="translate-y-px"
                />
              </th>
              <SortHeader {...sortProps} col="name" label={t("fields.name")} />
              <SortHeader {...sortProps} col="category" label={t("fields.category")} className="w-[14%]" />
              <SortHeader {...sortProps} col="condition" label={t("fields.status")} className="w-[16%]" />
              <SortHeader {...sortProps} col="location" label={t("fields.location")} className="hidden w-[14%] lg:table-cell" />
              <SortHeader {...sortProps} col="quantity" label={t("fields.quantity")} className="w-20" alignRight />
              <th className={cn(TH, "hidden w-32 xl:table-cell")}>{t("fields.dmx_address")}</th>
              <th className={cn(TH, "hidden w-28 text-right 2xl:table-cell")}>{t("fields.unit_price")}</th>
              <th className={cn(TH, "w-10")}>
                <span className="sr-only">{t("common.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, index) => {
              const isSelected = selectedIds.has(item.id);
              const dmx = formatDmx(item);
              const price = formatPrice(item.unit_price, i18n.language);
              const cell = cn(TD, "border-b border-border", index === sorted.length - 1 && "border-b-0");

              return (
                <InventoryContextMenu
                  key={item.id}
                  item={item}
                  onUpdateItem={onUpdateItem ?? noopAsync}
                  onAddItem={onAddItem ?? noopAsync}
                  onFilterCategory={onFilterCategory ?? noop}
                  projects={projects}
                >
                  <tr
                    className={cn(
                      "group cursor-pointer transition-colors",
                      isSelected ? "bg-primary/[0.06] hover:bg-primary/10" : "hover:bg-muted/50"
                    )}
                    onClick={(e) => {
                      if (selectionMode) handleCheck(index, e.shiftKey);
                      else onViewDetails?.(item.id);
                    }}
                  >
                    <td className={cn(cell, "pr-0")} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => {
                          e.preventDefault();
                          handleCheck(index, e.shiftKey);
                        }}
                        aria-label={t("inventory.select_item_aria", { name: item.name })}
                        className="translate-y-px"
                      />
                    </td>

                    <td className={cn(cell, "max-w-0")}>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <ItemThumb src={item.image_url} alt="" className="h-7 w-7" />
                        <span className="truncate font-medium text-foreground">{item.name}</span>
                        <ItemTags tags={item.tags} max={2} className="hidden lg:flex" />
                      </div>
                    </td>

                    <td className={cn(cell, "max-w-0 truncate text-muted-foreground")}>
                      {categoryLabel(item.category)}
                    </td>

                    <td className={cn(cell, "max-w-0")}>
                      <div className="flex min-w-0 items-center gap-2">
                        <StatusBadge condition={item.condition} />
                        {item.condition === "verliehen" && item.lent_to && (
                          <span className="truncate text-xs text-muted-foreground" title={item.lent_to}>
                            {item.lent_to}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className={cn(cell, "hidden max-w-0 truncate text-muted-foreground lg:table-cell")}>
                      {item.location || <span className="text-muted-foreground/50">—</span>}
                    </td>

                    <td className={cn(cell, "text-right font-mono tabular-nums")}>{item.quantity}</td>

                    <td className={cn(cell, "hidden font-mono text-xs tabular-nums text-muted-foreground xl:table-cell")}>
                      {dmx ?? <span className="text-muted-foreground/50">—</span>}
                    </td>

                    <td className={cn(cell, "hidden text-right font-mono text-xs tabular-nums text-muted-foreground 2xl:table-cell")}>
                      {price ?? <span className="text-muted-foreground/50">—</span>}
                    </td>

                    <td className={cn(cell, "px-1.5 text-right")} onClick={(e) => e.stopPropagation()}>
                      <ItemActionsMenu
                        className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                        onShowQr={() => setQrItemId(item.id)}
                        onEdit={() => onEdit(item)}
                        onDelete={() => onDelete(item.id)}
                      />
                    </td>
                  </tr>
                </InventoryContextMenu>
              );
            })}
          </tbody>
        </table>
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
