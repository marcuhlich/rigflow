import type { TFunction } from "i18next";
import type { InventoryItem } from "@/types/inventory";
import type { EnrichedProjectItem } from "@/hooks/useProjectDetail";
import type { ConflictInfo } from "./constants";

/**
 * Availability conflicts for inventory items that are NOT yet in this project
 * (defect, lent out, or in use elsewhere). Keyed by inventory item id.
 */
export function buildConflicts(
  inventory: InventoryItem[],
  projectItems: EnrichedProjectItem[],
  t: TFunction,
): Record<string, ConflictInfo> {
  const own = new Set(projectItems.map(i => i.inventory_item_id));
  const result: Record<string, ConflictInfo> = {};
  for (const item of inventory) {
    if (own.has(item.id)) continue;
    if (item.condition === "defekt") {
      result[item.id] = { type: "defect", label: t("project_detail.conflict.defect") };
    } else if (item.condition === "verliehen") {
      result[item.id] = {
        type: "lending",
        label: item.lent_to
          ? t("project_detail.conflict.lending_named", { name: item.lent_to })
          : t("project_detail.conflict.lending"),
      };
    } else if (item.condition === "in-einsatz") {
      result[item.id] = { type: "project", label: t("project_detail.conflict.project") };
    }
  }
  return result;
}
