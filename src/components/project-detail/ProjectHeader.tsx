import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  Archive, CalendarDays, ChevronLeft, ClipboardList, Flag, MapPin, MoreHorizontal, Pencil, Star, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import type { Project, ProjectStatus } from "@/types/project";
import { cn } from "@/lib/utils";
import { IN_USE_PHASES } from "./constants";
import { ProjectStatusMenu } from "./ProjectStatusMenu";

interface Props {
  project: Project;
  isReadonly: boolean;
  onStatusChange: (status: ProjectStatus) => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenReport: () => void;
  onFinalize: () => void;
}

function formatRange(start: string | null, end: string | null) {
  if (!start) return null;
  const s = format(parseISO(start), "dd.MM.yyyy");
  if (!end || end === start) return s;
  return `${s} – ${format(parseISO(end), "dd.MM.yyyy")}`;
}

export function ProjectHeader({
  project, isReadonly, onStatusChange, onToggleFavorite, onEdit, onDelete, onOpenReport, onFinalize,
}: Props) {
  const { t } = useTranslation();
  const range = formatRange(project.event_date_start, project.event_date_end);
  const inUse = IN_USE_PHASES.includes(project.status) && !isReadonly;

  return (
    <PageHeader
      eyebrow={
        <Link to="/projects" className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
          <ChevronLeft className="h-3.5 w-3.5" />
          {t("nav.projects")}
        </Link>
      }
      title={project.name}
      description={
        <>
          {project.description && <span className="mb-2 block">{project.description}</span>}
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <ProjectStatusMenu status={project.status} onChange={onStatusChange} disabled={isReadonly} />
            {range && (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <CalendarDays className="h-3.5 w-3.5" />
                {range}
              </span>
            )}
            {project.location && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{project.location}</span>
              </span>
            )}
            {inUse && (
              <span className="inline-flex items-center gap-1.5 text-info">
                <span className="h-1.5 w-1.5 rounded-full bg-info" />
                {t("project_detail.conflict.project")}
              </span>
            )}
            {isReadonly && (
              <span className="inline-flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5" />
                {t("project_detail.archived_badge")}
              </span>
            )}
          </span>
        </>
      }
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFavorite}
            disabled={isReadonly}
            aria-pressed={project.is_favorite}
            aria-label={t("project_detail.favorite_toggle")}
          >
            <Star className={cn(project.is_favorite ? "fill-primary text-primary" : "text-muted-foreground")} />
          </Button>
          {!isReadonly && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil />
              {t("common.edit")}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-8 px-0" aria-label={t("common.more")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem onSelect={onOpenReport} className="gap-2">
                <ClipboardList className="h-4 w-4" />
                {t("report.title")}
              </DropdownMenuItem>
              {!isReadonly && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={onDelete} className="gap-2 text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {project.status === "returning" && !isReadonly && (
            <Button size="sm" onClick={onFinalize}>
              <Flag />
              {t("project_detail.returning_banner.btn")}
            </Button>
          )}
        </>
      }
    />
  );
}
