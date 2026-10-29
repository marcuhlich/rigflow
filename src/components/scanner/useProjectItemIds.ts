import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProjectItemsStatus = "idle" | "loading" | "ready" | "error";

/**
 * Loads the inventory item ids assigned to a project.
 * `projectId === null` means "no project" (status idle).
 * Stale responses from a previously selected project are ignored.
 */
export function useProjectItemIds(projectId: string | null) {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<ProjectItemsStatus>(projectId ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setIds(new Set());
    setError(null);
    if (!projectId) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void supabase
      .from("project_items")
      .select("inventory_item_id")
      .eq("project_id", projectId)
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setStatus("error");
          return;
        }
        setIds(new Set((data ?? []).map((r) => r.inventory_item_id)));
        setStatus("ready");
      });
    return () => { cancelled = true; };
  }, [projectId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ids, status, error, retry };
}
