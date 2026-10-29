import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project, ProjectStatus } from "@/types/project";
import { cn } from "@/lib/utils";
import { ProjectStatusPicker } from "./projectStatus";
import { formatDayRange, parseDay } from "./format";

interface Props {
  projects: Project[];
  /** Item lines per project id; undefined while loading or if unavailable. */
  itemCounts?: Record<string, number>;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onStatusChange: (id: string, status: ProjectStatus) => void;
  onToggleFavorite: (project: Project) => void;
}

export function ProjectList(props: Props) {
  return (
    <>
      <ProjectTable {...props} />
      <ProjectRows {...props} />
    </>
  );
}

function usePeriod() {
  const { i18n } = useTranslation();
  return (p: Project) =>
    formatDayRange(parseDay(p.event_date_start), parseDay(p.event_date_end), i18n.language);
}

function stop(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

// ─── Desktop: dense table ─────────────────────────────────────────────────────

function ProjectTable({ projects, itemCounts, onEdit, onDelete, onStatusChange, onToggleFavorite }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const period = usePeriod();

  return (
    <div className="surface hidden overflow-hidden lg:block">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-surface-sunken text-left">
          <tr className="text-xs font-medium text-muted-foreground">
            <th className="w-10 px-3 py-2"><span className="sr-only">{t("projects.list.favorite")}</span></th>
            <th className="px-3 py-2 font-medium">{t("projects.list.col_name")}</th>
            <th className="px-3 py-2 font-medium">{t("projects.form.location_label")}</th>
            <th className="px-3 py-2 font-medium">{t("projects.form.period_label")}</th>
            <th className="px-3 py-2 text-right font-medium">{t("projects.list.col_items")}</th>
            <th className="px-3 py-2 font-medium">{t("projects.list.filter_status")}</th>
            <th className="w-12 px-3 py-2"><span className="sr-only">{t("common.actions")}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {projects.map(p => (
            <tr
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="cursor-pointer transition-colors hover:bg-muted/50 focus-within:bg-muted/50"
            >
              <td className="px-3 py-2.5" onClick={stop}>
                <FavoriteButton project={p} onToggle={onToggleFavorite} />
              </td>
              <td className="max-w-0 px-3 py-2.5">
                <Link
                  to={`/projects/${p.id}`}
                  onClick={stop}
                  className="block truncate font-medium hover:underline"
                >
                  {p.name}
                </Link>
                {p.description && (
                  <p className="truncate text-xs text-muted-foreground">{p.description}</p>
                )}
              </td>
              <td className="max-w-[14rem] truncate px-3 py-2.5 text-muted-foreground">
                {p.location || <Dash />}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                {period(p) ? <span className="tech">{period(p)}</span> : <Dash />}
              </td>
              <td className="px-3 py-2.5 text-right">
                <ItemCount count={itemCounts?.[p.id]} />
              </td>
              <td className="px-3 py-2.5" onClick={stop}>
                <ProjectStatusPicker project={p} onChange={onStatusChange} />
              </td>
              <td className="px-2 py-2.5 text-right" onClick={stop}>
                <RowMenu project={p} onEdit={onEdit} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Mobile: compact rows ─────────────────────────────────────────────────────

function ProjectRows({ projects, itemCounts, onEdit, onDelete, onStatusChange, onToggleFavorite }: Props) {
  const { t } = useTranslation();
  const period = usePeriod();

  return (
    <ul className="surface divide-y divide-border overflow-hidden lg:hidden">
      {projects.map(p => {
        const range = period(p);
        const count = itemCounts?.[p.id];
        return (
          <li key={p.id} className="relative flex items-start gap-2 px-3 py-3 active:bg-muted/50">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {p.is_favorite && (
                  <Star className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" aria-label={t("projects.list.favorite")} />
                )}
                {/* Stretched link: the whole row opens the project. */}
                <Link
                  to={`/projects/${p.id}`}
                  className="truncate text-sm font-medium after:absolute after:inset-0 after:content-['']"
                >
                  {p.name}
                </Link>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {range && <span className="tech text-foreground/80">{range}</span>}
                {p.location && <span className="truncate">{p.location}</span>}
                {count !== undefined && (
                  <span>
                    <span className="tech text-foreground/80">{count}</span> {t("projects.list.col_items")}
                  </span>
                )}
              </div>
            </div>
            <div className="relative z-10 flex shrink-0 items-center gap-0.5">
              <ProjectStatusPicker project={p} onChange={onStatusChange} />
              <RowMenu project={p} onEdit={onEdit} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

function Dash() {
  return <span className="text-muted-foreground/60">–</span>;
}

function ItemCount({ count }: { count: number | undefined }) {
  if (count === undefined) return <Dash />;
  return <span className={cn("tech", count === 0 && "text-muted-foreground")}>{count}</span>;
}

function FavoriteButton({ project, onToggle }: { project: Project; onToggle: (p: Project) => void }) {
  const { t } = useTranslation();
  const label = project.is_favorite ? t("projects.list.favorite_remove") : t("projects.list.favorite_add");
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={project.is_favorite}
      title={label}
      onClick={() => onToggle(project)}
      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Star className={cn("h-4 w-4", project.is_favorite && "fill-primary text-primary")} />
    </button>
  );
}

function RowMenu({ project, onEdit, onDelete, onToggleFavorite }: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  onToggleFavorite: (p: Project) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("common.actions")}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => navigate(`/projects/${project.id}`)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {t("projects.list.open")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(project)}>
          <Pencil className="mr-2 h-4 w-4" />
          {t("common.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onToggleFavorite(project)}>
          <Star className="mr-2 h-4 w-4" />
          {project.is_favorite ? t("projects.list.favorite_remove") : t("projects.list.favorite_add")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onDelete(project)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
