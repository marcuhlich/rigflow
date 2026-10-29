import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { PackageWithItems } from "@/types/project";
import type { InventoryItem } from "@/types/inventory";
import { cn } from "@/lib/utils";
import type { ConflictInfo } from "./constants";

interface Props {
  open: boolean;
  onClose: () => void;
  packages: PackageWithItems[];
  inventoryItems: InventoryItem[];
  addedPackageIds: Set<string>;
  addedItemIds: Set<string>;
  conflicts: Record<string, ConflictInfo>;
  onAddPackage: (id: string) => Promise<boolean>;
  onAddItem: (id: string, qty: number) => Promise<boolean>;
}

type PickerTab = "packages" | "items";

function AddedTag({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
      <Check className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function EquipmentPickerDialog({
  open, onClose, packages, inventoryItems, addedPackageIds, addedItemIds, conflicts, onAddPackage, onAddItem,
}: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<PickerTab>("packages");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setSearch(""); setTab("packages"); setQuantities({}); }
  }, [open]);

  const q = search.trim().toLowerCase();
  const filteredPkgs = useMemo(() => packages.filter(p =>
    p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)), [packages, q]);
  const filteredItems = useMemo(() => inventoryItems.filter(i =>
    i.name.toLowerCase().includes(q) || (i.category ?? "").toLowerCase().includes(q)), [inventoryItems, q]);

  const run = async (key: string, action: () => Promise<boolean>) => {
    setAdding(key);
    try { await action(); } finally { setAdding(null); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 pb-4 pt-5">
          <DialogTitle>{t("project_detail.picker.title")}</DialogTitle>
          <DialogDescription>{t("project_detail.picker.desc")}</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 flex-col gap-2 border-b border-border px-5 py-3 sm:flex-row sm:items-center">
          <Tabs value={tab} onValueChange={v => setTab(v as PickerTab)}>
            <TabsList>
              <TabsTrigger value="packages">{t("project_detail.picker.tab_packages", { count: packages.length })}</TabsTrigger>
              <TabsTrigger value="items">{t("project_detail.picker.tab_items", { count: inventoryItems.length })}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tab === "packages" ? t("project_detail.picker.search_packages") : t("project_detail.picker.search_items")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "packages" && (filteredPkgs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("project_detail.picker.no_packages")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {filteredPkgs.map(pkg => {
                const already = addedPackageIds.has(pkg.id);
                const pkgConflicts = pkg.items.filter(i => conflicts[i.inventory_item_id]).length;
                return (
                  <li key={pkg.id} className={cn("flex items-center gap-3 px-5 py-2.5", already && "opacity-60")}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: pkg.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("project_detail.package_group.item_count", { count: pkg.items.length })}
                        {pkgConflicts > 0 && !already && (
                          <span className="ml-2 inline-flex items-center gap-1 text-warning">
                            <AlertTriangle className="h-3 w-3" />
                            {t("project_detail.picker.conflict_count", { count: pkgConflicts })}
                          </span>
                        )}
                      </p>
                    </div>
                    {already ? (
                      <AddedTag label={t("project_detail.picker.already_added")} />
                    ) : (
                      <Button size="sm" variant="outline" disabled={adding !== null}
                        onClick={() => run(pkg.id, () => onAddPackage(pkg.id))}>
                        {adding === pkg.id ? <Loader2 className="animate-spin" /> : <Plus />}
                        {t("project_detail.picker.add_btn")}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ))}

          {tab === "items" && (filteredItems.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("project_detail.picker.no_items")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {filteredItems.map(item => {
                const conflict = conflicts[item.id];
                const already = addedItemIds.has(item.id);
                const max = Math.max(1, item.quantity);
                return (
                  <li key={item.id} className={cn("flex items-center gap-3 px-5 py-2.5", already && "opacity-60")}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t("project_detail.picker.item_meta", { category: item.category, location: item.location, quantity: item.quantity })}
                      </p>
                      {conflict && (
                        <p className={cn("mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium",
                          conflict.type === "defect" ? "text-destructive" : "text-warning")}>
                          <AlertTriangle className="h-3 w-3" />
                          {conflict.label}
                        </p>
                      )}
                    </div>
                    {already ? (
                      <AddedTag label={t("project_detail.picker.in_project")} />
                    ) : (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={max}
                          value={quantities[item.id] ?? 1}
                          onChange={e => setQuantities(prev => ({
                            ...prev,
                            [item.id]: Math.min(max, Math.max(1, parseInt(e.target.value, 10) || 1)),
                          }))}
                          className="h-8 w-16 text-center font-mono text-[13px] tabular-nums"
                          aria-label={t("project_detail.edit_quantity.label")}
                        />
                        <Button size="icon" variant="outline" className="h-8 w-8" disabled={adding !== null}
                          aria-label={t("project_detail.picker.add_btn")}
                          onClick={() => run(item.id, () => onAddItem(item.id, quantities[item.id] ?? 1))}>
                          {adding === item.id ? <Loader2 className="animate-spin" /> : <Plus />}
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
