import { useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ArrowUpDown, FolderKanban, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyPanel, ErrorState, ListSkeleton } from "@/components/QueryState";
import { useProjects, STATUS_ORDER, isWarningJump } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { getProjectStatusLabel } from "@/i18n/helpers";
import { Project, ProjectStatus } from "@/types/project";
import { ProjectFormData, ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectList } from "./ProjectList";
import { StatusDot } from "./projectStatus";
import { useProjectItemCounts } from "./useProjectItemCounts";

type SortKey = "created" | "name" | "date" | "status";
type StatusFilter = ProjectStatus | "all";

const SORT_KEYS: SortKey[] = ["created", "name", "date", "status"];
const SORT_LABEL_KEYS: Record<SortKey, string> = {
  created: "projects.list.sort_newest",
  name:    "projects.list.sort_name",
  date:    "projects.list.sort_date",
  status:  "projects.list.sort_status",
};

function toPayload(data: ProjectFormData) {
  return {
    name:             data.name,
    description:      data.description || null,
    location:         data.location || null,
    event_date_start: data.dateStart,
    event_date_end:   data.dateEnd,
    notes:            data.notes || null,
  };
}

/** Mutations in useProjects toast on failure and re-throw; swallow here so nothing goes unhandled. */
async function quietly(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch {
    return false;
  }
}

export function ProjectsTab() {
  const projectsState = useProjects();
  const {
    projects, loading, refetch,
    createProject, updateProject, updateStatus, deleteProject,
  } = projectsState;
  // Forward-compatible: shows the error panel as soon as the hook exposes `error`.
  const loadError = "error" in projectsState ? projectsState.error : null;
  const counts = useProjectItemCounts();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [formOpen, setFormOpen]           = useState(false);
  const [editProject, setEditProject]     = useState<Project | null>(null);
  const [editOpen, setEditOpen]           = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState<Project | null>(null);
  const [search, setSearch]               = useState("");
  const [sortBy, setSortBy]               = useState<SortKey>("created");
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");
  const [pendingStatus, setPendingStatus] = useState<{ id: string; from: ProjectStatus; to: ProjectStatus } | null>(null);

  const statusCounts = useMemo(() => {
    const map = new Map<ProjectStatus, number>();
    for (const p of projects) map.set(p.status, (map.get(p.status) ?? 0) + 1);
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    let result = projects;
    if (statusFilter !== "all") result = result.filter(p => p.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q) ||
        (p.notes ?? "").toLowerCase().includes(q),
      );
    }
    return [...result].sort((a, b) => {
      if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "date") {
        // Undated projects go last instead of first.
        const da = a.event_date_start ?? "￿";
        const db = b.event_date_start ?? "￿";
        return da.localeCompare(db) || a.name.localeCompare(b.name);
      }
      if (sortBy === "status") return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [projects, search, sortBy, statusFilter]);

  const handleStatusChange = (id: string, to: ProjectStatus) => {
    const project = projects.find(p => p.id === id);
    if (!project || project.status === to) return;
    if (isWarningJump(project.status, to)) setPendingStatus({ id, from: project.status, to });
    else void quietly(() => updateStatus(id, to));
  };

  const confirmStatusChange = () => {
    if (!pendingStatus) return;
    const { id, to } = pendingStatus;
    setPendingStatus(null);
    void quietly(() => updateStatus(id, to));
  };

  const handleCreate = async (data: ProjectFormData) => {
    await createProject(toPayload(data));
    void counts.refetch();
    toast({
      title: t("projects.toast.created_title"),
      description: t("projects.toast.created_desc", { name: data.name }),
    });
  };

  const handleUpdate = async (data: ProjectFormData) => {
    if (!editProject) return;
    await updateProject(editProject.id, toPayload(data));
    toast({ title: t("projects.toast.saved_title") });
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    if (await quietly(() => deleteProject(target.id))) {
      toast({ title: t("projects.toast.deleted_title") });
    }
  };

  // Toggle from the row's own data (the hook's toggleFavorite reads a possibly stale closure).
  const handleToggleFavorite = (project: Project) => {
    void quietly(() => updateProject(project.id, { is_favorite: !project.is_favorite }));
  };

  const hasFilters = statusFilter !== "all" || search.trim() !== "";

  const renderList = () => {
    if (loading && projects.length === 0) return <ListSkeleton rows={6} />;
    if (loadError && projects.length === 0) return <ErrorState error={loadError} onRetry={() => void refetch()} />;
    if (projects.length === 0) {
      return (
        <EmptyPanel
          icon={FolderKanban}
          title={t("projects.list.empty_title")}
          description={t("projects.list.empty_desc")}
          action={
            <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              <Plus />
              {t("projects.list.empty_btn")}
            </Button>
          }
        />
      );
    }
    if (filtered.length === 0) {
      return (
        <EmptyPanel
          icon={Search}
          title={t("projects.list.no_results")}
          action={
            hasFilters ? (
              <Button size="sm" variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                {t("common.reset")}
              </Button>
            ) : undefined
          }
        />
      );
    }
    return (
      <ProjectList
        projects={filtered}
        itemCounts={counts.data}
        onEdit={p => { setEditProject(p); setEditOpen(true); }}
        onDelete={setDeleteTarget}
        onStatusChange={handleStatusChange}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("projects.list.search_placeholder")}
            aria-label={t("common.search")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-auto gap-2" aria-label={t("common.sort")}>
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_KEYS.map(k => (
              <SelectItem key={k} value={k}>{t(SORT_LABEL_KEYS[k])}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setFormOpen(true)} className="ml-auto">
          <Plus />
          {t("projects.list.btn_new")}
        </Button>
      </div>

      {/* Status filter */}
      {projects.length > 0 && (
        <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
          <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
            <TabsList className="w-max" aria-label={t("projects.list.filter_status")}>
              <TabsTrigger value="all" className="gap-1.5">
                {t("common.all")}
                <span className="tech text-muted-foreground">{projects.length}</span>
              </TabsTrigger>
              {STATUS_ORDER.map(s => (
                <TabsTrigger key={s} value={s} className="gap-1.5">
                  <StatusDot status={s} />
                  {getProjectStatusLabel(s, t)}
                  <span className="tech text-muted-foreground">{statusCounts.get(s) ?? 0}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {renderList()}

      {/* Dialogs */}
      <ProjectFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleCreate} />

      <ProjectFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        initial={editProject ? {
          name:        editProject.name,
          description: editProject.description ?? "",
          location:    editProject.location ?? "",
          dateStart:   editProject.event_date_start,
          dateEnd:     editProject.event_date_end,
          notes:       editProject.notes ?? "",
        } : undefined}
      />

      <AlertDialog open={!!pendingStatus} onOpenChange={v => !v && setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projects.status_change.warning_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              <Trans
                i18nKey="projects.status_change.warning_desc"
                values={{
                  from: pendingStatus ? getProjectStatusLabel(pendingStatus.from, t) : "",
                  to:   pendingStatus ? getProjectStatusLabel(pendingStatus.to, t) : "",
                }}
                components={{ strong: <strong className="font-medium text-foreground" /> }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>{t("projects.status_change.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projects.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("projects.delete.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
