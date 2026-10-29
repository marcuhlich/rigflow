import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { EnrichedProjectItem } from "@/hooks/useProjectDetail";
import type { Project } from "@/types/project";
import type { FinalizeOptions } from "./constants";

interface Args {
  project: Project | null;
  allItems: EnrichedProjectItem[];
  restoreAllProjectItems: () => Promise<void>;
  refetch: () => Promise<void>;
}

const unique = (ids: string[]) => [...new Set(ids.filter(Boolean))];

/**
 * Archive flow at the end of the "returning" phase.
 *
 * Order matters:
 *  1. Return all items (available + original location).
 *  2. Apply the user's decision for unresolved items (lost → defect / found → available).
 *  3. Mark damaged items defect and log a maintenance record.
 *  4. Archive the project.
 *
 * Any failing step aborts the flow before the project is archived, so the user
 * can retry from the "returning" phase. Steps 1–3 are idempotent. A failed
 * maintenance log is reported but doesn't block archiving.
 */
export function useFinalizeProject({ project, allItems, restoreAllProjectItems, refetch }: Args) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  return useCallback(async (options: FinalizeOptions): Promise<boolean> => {
    if (!project) return false;

    const unresolvedIds = unique(
      allItems.filter(i => i.condition === "missing" || !i.packed).map(i => i.inventory_item_id),
    );
    const damagedIds = unique(allItems.filter(i => i.condition === "damaged").map(i => i.inventory_item_id));

    try {
      await restoreAllProjectItems();

      if (unresolvedIds.length > 0 && options.missingAction) {
        const condition = options.missingAction === "lost" ? "defekt" : "verfügbar";
        const { error } = await supabase.from("inventory_items").update({ condition }).in("id", unresolvedIds);
        if (error) throw new Error(error.message);
      }

      let maintenanceFailed = false;
      if (options.sendDamagedToMaintenance && damagedIds.length > 0) {
        const { error } = await supabase.from("inventory_items").update({ condition: "defekt" }).in("id", damagedIds);
        if (error) throw new Error(error.message);

        if (user) {
          const now = new Date().toISOString();
          const { error: logError } = await supabase.from("maintenance_records").insert(
            damagedIds.map(id => ({
              item_id: id,
              user_id: user.id,
              type: "reparatur",
              notes: t("project_detail.finalize.maintenance_note", { name: project.name }),
              performed_at: now,
            })),
          );
          maintenanceFailed = !!logError;
        } else {
          maintenanceFailed = true;
        }
      }

      const { error: archiveError } = await supabase.from("projects").update({ status: "archived" }).eq("id", project.id);
      if (archiveError) throw new Error(archiveError.message);

      toast({ title: t("project_detail.finalize_toast"), description: t("project_detail.finalize_desc", { name: project.name }) });
      if (maintenanceFailed) {
        toast({ title: t("project_detail.finalize.maintenance_failed"), variant: "destructive" });
      }
      await refetch();
      return true;
    } catch (err) {
      toast({
        title: t("project_detail.finalize.failed"),
        description: err instanceof Error ? err.message : t("common.unknown_error"),
        variant: "destructive",
      });
      await refetch();
      return false;
    }
  }, [project, allItems, restoreAllProjectItems, refetch, user, toast, t]);
}
