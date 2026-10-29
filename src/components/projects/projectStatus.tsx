import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_ORDER } from "@/hooks/useProjects";
import { getProjectStatusLabel } from "@/i18n/helpers";
import { Project, ProjectStatus } from "@/types/project";
import { cn } from "@/lib/utils";

/** Status is shown as neutral label + coloured dot; colour carries the meaning only. */
const STATUS_DOT: Record<ProjectStatus, string> = {
  draft:     "bg-muted-foreground/50",
  planned:   "bg-info",
  packed:    "bg-warning",
  transit:   "bg-warning",
  live:      "bg-success",
  returning: "bg-info",
  archived:  "bg-border-strong",
};

export function StatusDot({ status, className }: { status: ProjectStatus; className?: string }) {
  return <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[status], className)} />;
}

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-background px-1.5 py-px text-[11px] font-medium leading-4 text-foreground",
        status === "archived" && "text-muted-foreground",
        className,
      )}
    >
      <StatusDot status={status} />
      {getProjectStatusLabel(status, t)}
    </span>
  );
}

export function ProjectStatusPicker({ project, onChange }: {
  project: Project;
  onChange: (id: string, status: ProjectStatus) => void;
}) {
  const { t } = useTranslation();
  const currentIdx = STATUS_ORDER.indexOf(project.status);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("projects.list.change_status")}
          onClick={e => e.stopPropagation()}
          className="group inline-flex items-center gap-0.5 rounded-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ProjectStatusBadge status={project.status} className="group-hover:border-border-strong" />
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48" onClick={e => e.stopPropagation()}>
        {STATUS_ORDER.map((s, idx) => {
          const isCurrent = s === project.status;
          return (
            <DropdownMenuItem
              key={s}
              disabled={isCurrent}
              onSelect={() => onChange(project.id, s)}
              className="gap-2"
            >
              <StatusDot status={s} />
              <span>{getProjectStatusLabel(s, t)}</span>
              {idx === currentIdx + 1 && (
                <span className="ml-auto text-[11px] text-muted-foreground">{t("projects.status_next")}</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
