import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getProjectStatusLabel } from "@/i18n/helpers";
import type { InventoryItem } from "@/types/inventory";
import type { Project } from "@/types/project";

type LoadState = "loading" | "ready" | "error";

/** Loads the projects an item is assigned to. Ignores stale responses. */
function useItemProjects(itemId: string, projects: Project[] | undefined) {
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!projects) return;
    let cancelled = false;
    setState("loading");
    void supabase
      .from("project_items")
      .select("project_id")
      .eq("inventory_item_id", itemId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setState("error"); return; }
        setProjectIds((data ?? []).map((r) => r.project_id));
        setState("ready");
      });
    return () => { cancelled = true; };
  }, [itemId, projects, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const ids = new Set(projectIds);
  return { itemProjects: (projects ?? []).filter((p) => ids.has(p.id)), state, retry };
}

interface ItemPositionDetailsProps {
  item: InventoryItem;
  projects?: Project[];
}

/** Where an item belongs: stored location, assigned projects, technical notes. */
export function ItemPositionDetails({ item, projects }: ItemPositionDetailsProps) {
  const { t, i18n } = useTranslation();
  const { itemProjects, state, retry } = useItemProjects(item.id, projects);
  const dateLocale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";
  const fmt = (d: string) => new Date(d).toLocaleDateString(dateLocale);

  return (
    <div className="space-y-3 text-[13px]">
      <dl className="divide-y divide-border rounded-md border border-border">
        <div className="flex items-baseline justify-between gap-3 px-3 py-2">
          <dt className="text-muted-foreground">{t("qr_scanner.position_modal.stored_location")}</dt>
          <dd className="truncate text-right font-medium">{item.location || "—"}</dd>
        </div>
        {item.dmx_start_address != null && (
          <div className="flex items-baseline justify-between gap-3 px-3 py-2">
            <dt className="text-muted-foreground">{t("fields.dmx_address")}</dt>
            <dd className="tech text-right">
              U{item.dmx_universe || 1}.{String(item.dmx_start_address).padStart(3, "0")}
              {item.dmx_channels ? ` · ${item.dmx_channels} ch` : ""}
            </dd>
          </div>
        )}
        {item.accessories && (
          <div className="px-3 py-2">
            <dt className="text-muted-foreground">{t("fields.accessories")}</dt>
            <dd className="mt-0.5 whitespace-pre-line">{item.accessories}</dd>
          </div>
        )}
        {item.notes && (
          <div className="px-3 py-2">
            <dt className="text-muted-foreground">{t("fields.notes")}</dt>
            <dd className="mt-0.5 whitespace-pre-line">{item.notes}</dd>
          </div>
        )}
      </dl>

      {projects && (
        <div>
          <p className="eyebrow mb-1.5">{t("qr_scanner.position_modal.section_projects")}</p>
          {state === "loading" && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("common.loading")}
            </p>
          )}
          {state === "error" && (
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span>{t("common.load_error")}</span>
              <Button variant="outline" size="sm" onClick={retry}>{t("common.retry")}</Button>
            </div>
          )}
          {state === "ready" && itemProjects.length === 0 && (
            <p className="text-muted-foreground">{t("scanner.result.no_projects")}</p>
          )}
          {state === "ready" && itemProjects.length > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {itemProjects.map((project) => (
                <li key={project.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{project.name}</p>
                    {project.event_date_start && (
                      <p className="tech text-xs text-muted-foreground">
                        {fmt(project.event_date_start)}
                        {project.event_date_end && ` – ${fmt(project.event_date_end)}`}
                      </p>
                    )}
                  </div>
                  <Badge variant={project.status === "live" ? "default" : "outline"}>
                    {getProjectStatusLabel(project.status, t)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
