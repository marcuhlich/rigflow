import { format, parseISO } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/types/project";

interface Props {
  project: Project;
  showPackStatus: boolean;
  totalItems: number;
  packedItems: number;
  conflictCount: number;
  showConflicts: boolean;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 px-4 py-2.5 text-[13px]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** Right column on desktop (below the content on mobile): facts, pack status, conflicts. */
export function ProjectInfoPanel({ project, showPackStatus, totalItems, packedItems, conflictCount, showConflicts }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("de") ? de : enUS;
  const fmt = (d: string) => format(parseISO(d), "dd. MMM yyyy", { locale });
  const pct = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;
  const hasDetails = project.event_date_start || project.location || project.notes;

  return (
    <aside className="space-y-4">
      {showPackStatus && totalItems > 0 && (
        <section className="surface p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">{t("project_detail.sidebar.pack_title")}</h2>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{pct}%</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
            {packedItems}
            <span className="text-base font-normal text-muted-foreground"> / {totalItems}</span>
          </p>
          <Progress value={pct} className="mt-3 h-1.5" />
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>{t("project_detail.sidebar.packed_label")}: <span className="font-mono tabular-nums text-foreground">{packedItems}</span></span>
            <span>{t("project_detail.sidebar.pending_label")}: <span className="font-mono tabular-nums text-foreground">{totalItems - packedItems}</span></span>
          </div>
        </section>
      )}

      {showConflicts && conflictCount > 0 && (
        <section className="surface border-warning/30 p-4">
          <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-warning">
            <AlertTriangle className="h-4 w-4" />
            {t("project_detail.sidebar.conflicts_title")}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {t("project_detail.sidebar.conflicts_desc", { count: conflictCount })}
          </p>
        </section>
      )}

      <section className="surface overflow-hidden">
        <h2 className="eyebrow border-b border-border px-4 py-2.5">{t("project_detail.sidebar.info_title")}</h2>
        <dl className="divide-y divide-border">
          {project.event_date_start && (
            <Row label={t("projects.form.period_label")}>
              <span className="tabular-nums">{fmt(project.event_date_start)}</span>
              {project.event_date_end && project.event_date_end !== project.event_date_start && (
                <span className="block tabular-nums text-muted-foreground">
                  {t("project_detail.sidebar.date_until", { date: fmt(project.event_date_end) })}
                </span>
              )}
            </Row>
          )}
          {project.location && <Row label={t("report.meta.location")}>{project.location}</Row>}
          {project.notes && (
            <Row label={t("project_detail.edit_dialog.notes_label")}>
              <span className="whitespace-pre-wrap text-muted-foreground">{project.notes}</span>
            </Row>
          )}
        </dl>
        {!hasDetails && (
          <p className="px-4 py-2.5 text-[13px] text-muted-foreground">{t("project_detail.sidebar.no_details")}</p>
        )}
        <div className="space-y-0.5 border-t border-border bg-surface-sunken px-4 py-2.5 text-xs tabular-nums text-muted-foreground">
          <p>{t("project_detail.sidebar.created", { date: format(new Date(project.created_at), "dd.MM.yyyy") })}</p>
          <p>{t("project_detail.sidebar.updated", { date: format(new Date(project.updated_at), "dd.MM.yyyy") })}</p>
        </div>
      </section>
    </aside>
  );
}
