import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/QueryState";
import { DashboardPanel, PanelEmpty } from "@/components/dashboard/DashboardPanel";
import { getProjectStatusLabel } from "@/i18n/helpers";
import type { Project, ProjectStatus } from "@/types/project";

const WINDOW_DAYS = 30;
const LIMIT = 5;

/** Live / on-the-road projects use the info tone; everything else stays neutral. */
const ACTIVE_STATUSES: ProjectStatus[] = ["live", "transit", "returning"];

interface UpcomingProjectsProps {
  projects: Project[];
  loading: boolean;
}

/** Running projects and projects starting within the next 30 days. */
export function UpcomingProjects({ projects, loading }: UpcomingProjectsProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de") ? de : enUS;

  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    const until = addDays(today, WINDOW_DAYS);
    return projects
      .filter((p): p is Project & { event_date_start: string } => !!p.event_date_start && p.status !== "archived")
      .map((p) => {
        const start = parseISO(p.event_date_start);
        const end = p.event_date_end ? parseISO(p.event_date_end) : start;
        return { project: p, start, end };
      })
      // Still running (ends today or later) and starts inside the window
      .filter(({ start, end }) => end >= today && start <= until)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, LIMIT);
  }, [projects]);

  return (
    <DashboardPanel
      title={t("dashboard.upcoming_projects.title")}
      link={{ to: "/projects", label: t("dashboard.upcoming_projects.all_link") }}
    >
      {loading && projects.length === 0 ? (
        <ListSkeleton rows={3} className="rounded-none border-0" />
      ) : upcoming.length === 0 ? (
        <PanelEmpty>{t("dashboard.upcoming_projects.empty")}</PanelEmpty>
      ) : (
        <ul className="divide-y divide-border">
          {upcoming.map(({ project: p, start, end }) => {
            const multiDay = end.getTime() !== start.getTime();
            return (
              <li key={p.id}>
                <Link
                  to={`/projects/${p.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="w-11 shrink-0 text-center leading-none">
                    <div className="font-mono text-[17px] font-semibold tabular-nums">{format(start, "dd")}</div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {format(start, "MMM", { locale })}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {p.is_favorite && (
                        <Star className="h-3 w-3 shrink-0 fill-warning text-warning" aria-hidden />
                      )}
                      <p className="truncate text-[13px] font-medium">{p.name}</p>
                    </div>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {multiDay && `${format(start, "dd.MM.")}–${format(end, "dd.MM.")}`}
                      {multiDay && p.location && " · "}
                      {p.location}
                    </p>
                  </div>
                  <Badge variant={ACTIVE_STATUSES.includes(p.status) ? "inUse" : "outline"} className="shrink-0">
                    {getProjectStatusLabel(p.status, t)}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardPanel>
  );
}
