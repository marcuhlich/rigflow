import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronDown, ChevronRight, Pencil, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { EnrichedProjectItem, ProjectPackageGroup } from "@/hooks/useProjectDetail";
import { cn } from "@/lib/utils";
import { CONDITION_TEXT, CONDITION_VALUES, type Condition, type ConflictInfo } from "./constants";

export interface EquipmentListMode {
  /** Show the packed checkbox column */
  showPack: boolean;
  /** Packed checkboxes visible but read-only (in transit) */
  packDisabled: boolean;
  /** Show the return-condition column */
  showCond: boolean;
  /** Items/packages can be removed or edited */
  editable: boolean;
}

interface Props {
  mode: EquipmentListMode;
  packageGroups: ProjectPackageGroup[];
  directItems: EnrichedProjectItem[];
  conflicts: Record<string, ConflictInfo>;
  onTogglePacked: (itemId: string, packed: boolean) => void;
  onConditionChange: (itemId: string, condition: Condition) => void;
  onEditQuantity: (item: EnrichedProjectItem) => void;
  onRemoveItem: (item: EnrichedProjectItem) => void;
  onRemovePackage: (group: ProjectPackageGroup) => void;
}

function ConditionSelect({ value, onChange }: { value: Condition; onChange: (v: Condition) => void }) {
  const { t } = useTranslation();
  return (
    <Select value={value} onValueChange={v => onChange(v as Condition)}>
      <SelectTrigger
        className={cn("h-7 w-[112px] px-2 text-xs font-medium", CONDITION_TEXT[value])}
        aria-label={t("report.table.condition")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONDITION_VALUES.map(v => (
          <SelectItem key={v} value={v} className={cn("text-xs", CONDITION_TEXT[v])}>
            {t(`report.cond.${v}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ConflictTag({ conflict }: { conflict: ConflictInfo }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-[11px] font-medium",
        conflict.type === "defect" ? "text-destructive" : "text-warning",
      )}
    >
      <AlertTriangle className="h-3 w-3" />
      {conflict.label}
    </span>
  );
}

function ItemRow({ item, mode, conflict, removable, onTogglePacked, onConditionChange, onEditQuantity, onRemove }: {
  item: EnrichedProjectItem;
  mode: EquipmentListMode;
  conflict?: ConflictInfo;
  removable: boolean;
  onTogglePacked: (packed: boolean) => void;
  onConditionChange: (c: Condition) => void;
  onEditQuantity: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const checkboxId = `pack-${item.id}`;
  const struck = mode.showPack && item.packed;
  const name = item.item_name ?? t("packages.unknown");

  return (
    <div className={cn("flex min-h-[44px] items-center gap-3 px-3 py-2", struck && "bg-surface-sunken/60")}>
      {mode.showPack && (
        <Checkbox
          id={checkboxId}
          checked={item.packed}
          disabled={mode.packDisabled}
          onCheckedChange={v => onTogglePacked(v === true)}
          className="shrink-0"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {mode.showPack ? (
            <label htmlFor={checkboxId} className={cn("cursor-pointer truncate text-sm", struck && "text-muted-foreground line-through")}>
              {name}
            </label>
          ) : (
            <span className="truncate text-sm">{name}</span>
          )}
          {conflict && <ConflictTag conflict={conflict} />}
        </div>
        {item.item_category && <p className="truncate text-xs text-muted-foreground sm:hidden">{item.item_category}</p>}
      </div>

      <span className="hidden w-32 shrink-0 truncate text-[13px] text-muted-foreground sm:block">
        {item.item_category ?? "–"}
      </span>

      <span className="w-12 shrink-0 text-right font-mono text-[13px] tabular-nums">{item.quantity}</span>

      {mode.showCond && (
        <div className="shrink-0">
          <ConditionSelect value={item.condition} onChange={onConditionChange} />
        </div>
      )}

      {mode.editable && (
        <div className="flex w-14 shrink-0 justify-end gap-0.5">
          {removable && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onEditQuantity}
                aria-label={t("project_detail.edit_quantity.title")}>
                <Pencil className="!size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}
                aria-label={t("common.delete")}>
                <X className="!size-3.5" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GroupHeader({ title, meta, collapsed, onToggle, onRemove, color }: {
  title: string; meta: string; collapsed: boolean; onToggle: () => void; onRemove?: () => void; color?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 bg-surface-sunken px-3 py-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="flex min-w-0 flex-1 items-center gap-2 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      >
        {collapsed
          ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        {color && <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />}
        <span className="truncate text-[13px] font-medium">{title}</span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{meta}</span>
      </button>
      {onRemove && (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={onRemove}>
          {t("project_detail.equipment.remove_package")}
        </Button>
      )}
    </div>
  );
}

/** Dense checklist of the project's equipment, grouped by package. */
export function EquipmentList({
  mode, packageGroups, directItems, conflicts,
  onTogglePacked, onConditionChange, onEditQuantity, onRemoveItem, onRemovePackage,
}: Props) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const toggle = (key: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const meta = (items: EnrichedProjectItem[]) =>
    mode.showPack ? `${items.filter(i => i.packed).length}/${items.length}` : String(items.length);

  const renderRows = (items: EnrichedProjectItem[], removable: boolean) =>
    items.map(item => (
      <ItemRow
        key={item.id}
        item={item}
        mode={mode}
        conflict={conflicts[item.inventory_item_id]}
        removable={removable}
        onTogglePacked={p => onTogglePacked(item.id, p)}
        onConditionChange={c => onConditionChange(item.id, c)}
        onEditQuantity={() => onEditQuantity(item)}
        onRemove={() => onRemoveItem(item)}
      />
    ));

  return (
    <div className="surface overflow-hidden">
      {/* Column header (desktop) */}
      <div className="hidden items-center gap-3 border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground sm:flex">
        {mode.showPack && <span className="w-4 shrink-0" />}
        <span className="flex-1">{t("report.table.article")}</span>
        <span className="w-32 shrink-0">{t("report.table.category")}</span>
        <span className="w-12 shrink-0 text-right">{t("report.table.qty")}</span>
        {mode.showCond && <span className="w-[112px] shrink-0">{t("report.table.condition")}</span>}
        {mode.editable && <span className="w-14 shrink-0" />}
      </div>

      <div className="divide-y divide-border">
        {packageGroups.map(group => {
          const isCollapsed = collapsed.has(group.instanceId);
          return (
            <section key={group.instanceId} className="divide-y divide-border">
              <GroupHeader
                title={group.package.name}
                color={group.package.color}
                meta={meta(group.items)}
                collapsed={isCollapsed}
                onToggle={() => toggle(group.instanceId)}
                onRemove={mode.editable ? () => onRemovePackage(group) : undefined}
              />
              {!isCollapsed && (group.items.length === 0
                ? <p className="px-3 py-2.5 text-xs text-muted-foreground">{t("project_detail.package_group.empty")}</p>
                : renderRows(group.items, false))}
            </section>
          );
        })}

        {directItems.length > 0 && (
          <section className="divide-y divide-border">
            {packageGroups.length > 0 && (
              <GroupHeader
                title={t("project_detail.direct_items_title")}
                meta={meta(directItems)}
                collapsed={collapsed.has("direct")}
                onToggle={() => toggle("direct")}
              />
            )}
            {!collapsed.has("direct") && renderRows(directItems, mode.editable)}
          </section>
        )}
      </div>
    </div>
  );
}
