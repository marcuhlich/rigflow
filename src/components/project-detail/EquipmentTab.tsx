import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Archive, CheckCheck, Loader2, Lock, Package, Plus, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyPanel } from "@/components/QueryState";
import type { EnrichedProjectItem, ProjectPackageGroup } from "@/hooks/useProjectDetail";
import type { PackageWithItems, ProjectStatus } from "@/types/project";
import type { InventoryItem } from "@/types/inventory";
import {
  CONDITION_PHASES, LOCKED_PHASES, PACK_PHASES, SETUP_PHASES, type Condition, type ConflictInfo,
} from "./constants";
import { EquipmentList } from "./EquipmentList";
import { EditQuantityDialog } from "./EditQuantityDialog";
import { EquipmentPickerDialog } from "./EquipmentPickerDialog";

interface Props {
  projectId: string;
  status: ProjectStatus;
  isReadonly: boolean;
  packageGroups: ProjectPackageGroup[];
  directItems: EnrichedProjectItem[];
  totalItems: number;
  packedItems: number;
  packages: PackageWithItems[];
  availableInventory: InventoryItem[];
  conflicts: Record<string, ConflictInfo>;
  onAddPackage: (packageId: string) => Promise<boolean>;
  onRemovePackage: (instanceId: string) => Promise<boolean>;
  onAddItem: (inventoryItemId: string, qty: number) => Promise<boolean>;
  onRemoveItem: (itemId: string) => Promise<boolean>;
  onUpdateQuantity: (itemId: string, qty: number) => Promise<boolean>;
  onTogglePacked: (itemId: string, packed: boolean) => void;
  onConditionChange: (itemId: string, condition: Condition) => void;
  onMarkInUse: () => Promise<boolean>;
}

/** Inline phase hint with optional actions. Neutral surface, no colour wash. */
function PhaseNotice({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description?: string; children?: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <Icon className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function EquipmentTab({
  projectId, status, isReadonly, packageGroups, directItems, totalItems, packedItems,
  packages, availableInventory, conflicts,
  onAddPackage, onRemovePackage, onAddItem, onRemoveItem, onUpdateQuantity,
  onTogglePacked, onConditionChange, onMarkInUse,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [markingInUse, setMarkingInUse] = useState(false);
  const [editingItem, setEditingItem] = useState<EnrichedProjectItem | null>(null);
  const [removingGroup, setRemovingGroup] = useState<ProjectPackageGroup | null>(null);

  const isLocked = LOCKED_PHASES.includes(status) || isReadonly;
  const showPack = PACK_PHASES.includes(status) && !isReadonly;
  const showCond = CONDITION_PHASES.includes(status) && !isReadonly;
  const progress = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;

  const addedPackageIds = useMemo(() => new Set(packageGroups.map(g => g.package_id)), [packageGroups]);
  const addedItemIds = useMemo(() => {
    const ids = new Set<string>();
    packageGroups.forEach(g => g.items.forEach(i => ids.add(i.inventory_item_id)));
    directItems.forEach(i => ids.add(i.inventory_item_id));
    return ids;
  }, [packageGroups, directItems]);

  const handleMarkInUse = async () => {
    setMarkingInUse(true);
    try { await onMarkInUse(); } finally { setMarkingInUse(false); }
  };

  const editingMax = editingItem
    ? Math.max(editingItem.quantity, availableInventory.find(i => i.id === editingItem.inventory_item_id)?.quantity ?? 1)
    : 1;

  return (
    <div className="space-y-3">
      {/* Phase notices */}
      {SETUP_PHASES.includes(status) && totalItems > 0 && !isReadonly && (
        <PhaseNotice icon={ScanLine} title={t("project_detail.equipment.aufbau_title")} description={t("project_detail.equipment.aufbau_desc")}>
          <Button size="sm" variant="outline" onClick={() => navigate(`/scanner?mode=aufbau&projectId=${projectId}`)}>
            <ScanLine />
            {t("project_detail.equipment.aufbau_scanner")}
          </Button>
          <Button size="sm" variant="outline" disabled={markingInUse} onClick={handleMarkInUse}>
            {markingInUse ? <Loader2 className="animate-spin" /> : <CheckCheck />}
            {markingInUse ? t("project_detail.equipment.aufbau_marking") : t("project_detail.equipment.aufbau_all_short")}
          </Button>
        </PhaseNotice>
      )}

      {status === "returning" && totalItems > 0 && !isReadonly && (
        <PhaseNotice icon={ScanLine} title={t("project_detail.equipment.abbau_title")} description={t("project_detail.equipment.condition_hint")}>
          <Button size="sm" variant="outline" onClick={() => navigate(`/scanner?mode=abbau&projectId=${projectId}`)}>
            <ScanLine />
            {t("project_detail.equipment.abbau_btn")}
          </Button>
        </PhaseNotice>
      )}

      {isReadonly && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Archive className="h-3.5 w-3.5 shrink-0" />
          {t("project_detail.equipment.archived_hint")}
        </p>
      )}
      {!isReadonly && isLocked && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          {status === "transit" ? t("project_detail.equipment.transit_locked") : t("project_detail.equipment.locked_hint")}
        </p>
      )}

      {/* Toolbar */}
      {(totalItems > 0 || !isLocked) && (
        <div className="flex items-center gap-3">
          {showPack && totalItems > 0 ? (
            <div className="flex min-w-0 flex-1 items-center gap-3 lg:invisible">
              <span className="shrink-0 font-mono text-[13px] tabular-nums">
                {packedItems}<span className="text-muted-foreground">/{totalItems}</span>
              </span>
              <Progress value={progress} className="h-1.5 max-w-[200px]" aria-label={t("project_detail.equipment.progress_title")} />
            </div>
          ) : (
            <p className="flex-1 text-[13px] text-muted-foreground">
              {totalItems > 0 && t("project_detail.equipment.positions", { count: totalItems })}
            </p>
          )}
          {!isLocked && (
            <Button size="sm" variant={status === "returning" ? "outline" : "default"} onClick={() => setPickerOpen(true)}>
              <Plus />
              {t("project_detail.equipment.add_btn")}
            </Button>
          )}
        </div>
      )}

      {totalItems === 0 && packageGroups.length === 0 ? (
        <EmptyPanel
          icon={Package}
          title={t("project_detail.equipment.empty_title")}
          description={isLocked ? undefined : t("project_detail.equipment.empty_desc")}
        />
      ) : (
        <EquipmentList
          mode={{ showPack, packDisabled: status === "transit", showCond, editable: !isLocked }}
          packageGroups={packageGroups}
          directItems={directItems}
          conflicts={conflicts}
          onTogglePacked={onTogglePacked}
          onConditionChange={onConditionChange}
          onEditQuantity={setEditingItem}
          onRemoveItem={item => { void onRemoveItem(item.id); }}
          onRemovePackage={setRemovingGroup}
        />
      )}

      <EditQuantityDialog
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        itemName={editingItem?.item_name ?? ""}
        currentQty={editingItem?.quantity ?? 1}
        maxQty={editingMax}
        onSave={qty => (editingItem ? onUpdateQuantity(editingItem.id, qty) : Promise.resolve(false))}
      />

      {!isLocked && (
        <EquipmentPickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          packages={packages}
          inventoryItems={availableInventory}
          addedPackageIds={addedPackageIds}
          addedItemIds={addedItemIds}
          conflicts={conflicts}
          onAddPackage={onAddPackage}
          onAddItem={onAddItem}
        />
      )}

      <AlertDialog open={!!removingGroup} onOpenChange={v => !v && setRemovingGroup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("project_detail.equipment.remove_package_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("project_detail.equipment.remove_package_desc", {
                name: removingGroup?.package.name ?? "",
                count: removingGroup?.items.length ?? 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (removingGroup) void onRemovePackage(removingGroup.instanceId); }}
            >
              {t("project_detail.equipment.remove_package")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
