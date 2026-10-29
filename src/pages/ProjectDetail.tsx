import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ChevronLeft, FolderKanban, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyPanel, ErrorState, PageLoader } from "@/components/QueryState";
import { ProjectDMXTab } from "@/components/ProjectDMXTab";
import { ProjectReportDialog } from "@/components/ProjectReportDialog";
import { ProjectHeader } from "@/components/project-detail/ProjectHeader";
import { ProjectInfoPanel } from "@/components/project-detail/ProjectInfoPanel";
import { EquipmentTab } from "@/components/project-detail/EquipmentTab";
import { TodosTab } from "@/components/project-detail/TodosTab";
import { ProjectEditDialog } from "@/components/project-detail/ProjectEditDialog";
import { FinalizeProjectDialog } from "@/components/project-detail/FinalizeProjectDialog";
import { ProjectConfirmDialogs } from "@/components/project-detail/ProjectConfirmDialogs";
import { useFinalizeProject } from "@/components/project-detail/useFinalizeProject";
import { PACK_PHASES, type EditFormData } from "@/components/project-detail/constants";
import { buildConflicts } from "@/components/project-detail/conflicts";
import { useProjectDetail } from "@/hooks/useProjectDetail";
import { usePackages } from "@/hooks/usePackages";
import { isWarningJump } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import type { ProjectStatus } from "@/types/project";

type DetailTab = "equipment" | "todos" | "dmx";
const TABS: DetailTab[] = ["equipment", "todos", "dmx"];

function TabCount({ children }: { children: React.ReactNode }) {
  return <span className="ml-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">{children}</span>;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();

  const { packages, refetch: refetchPackages } = usePackages();
  const detail = useProjectDetail(id);
  const {
    project, packageGroups, directItems, allItems, todos, loading, error, availableInventory,
    totalItems, packedItems, refetch,
  } = detail;

  const finalize = useFinalizeProject({
    project, allItems, restoreAllProjectItems: detail.restoreAllProjectItems, refetch,
  });

  const rawTab = searchParams.get("tab");
  const tab: DetailTab = TABS.includes(rawTab as DetailTab) ? (rawTab as DetailTab) : "equipment";
  const setTab = (v: string) => setSearchParams(v === "equipment" ? {} : { tab: v }, { replace: true });

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{ from: ProjectStatus; to: ProjectStatus } | null>(null);

  const conflicts = useMemo(
    () => buildConflicts(availableInventory, allItems, t),
    [availableInventory, allItems, t],
  );

  const conditions = useMemo(
    () => Object.fromEntries(allItems.map(i => [i.id, i.condition])),
    [allItems],
  );

  if (loading) return <PageLoader />;

  if (error && !project) {
    return <ErrorState error={error} onRetry={() => { void refetch(); }} />;
  }

  if (!project || !id) {
    return (
      <EmptyPanel
        icon={FolderKanban}
        title={t("project_detail.no_project")}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/projects"><ChevronLeft />{t("nav.projects")}</Link>
          </Button>
        }
      />
    );
  }

  const isReadonly = project.status === "archived";
  const showPack = PACK_PHASES.includes(project.status);
  const doneTodos = todos.filter(td => td.done).length;

  const handleStatusChange = (to: ProjectStatus) => {
    if (isWarningJump(project.status, to)) setPendingStatus({ from: project.status, to });
    else void detail.updateStatus(to);
  };

  const handleEdit = async (data: EditFormData) => {
    const ok = await detail.updateProject({
      name: data.name,
      description: data.description || null,
      location: data.location || null,
      event_date_start: data.dateStart,
      event_date_end: data.dateEnd,
      notes: data.notes || null,
    });
    if (ok) toast({ title: t("projects.toast.saved_title") });
    return ok;
  };

  const handleDelete = async () => {
    if (!(await detail.deleteProject())) return;
    toast({ title: t("projects.toast.deleted_title") });
    navigate("/projects");
  };

  const handleAddPackage = async (packageId: string) => {
    const ok = await detail.addPackageToProject(packageId);
    if (ok) await refetchPackages();
    return ok;
  };

  return (
    <>
      <ProjectHeader
        project={project}
        isReadonly={isReadonly}
        onStatusChange={handleStatusChange}
        onToggleFavorite={() => { void detail.toggleFavorite(); }}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onOpenReport={() => setReportOpen(true)}
        onFinalize={() => setFinalizeOpen(true)}
      />

      {error && (
        <div className="surface mb-4 flex items-center gap-3 border-destructive/30 px-4 py-2.5 text-[13px]">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <span className="min-w-0 flex-1 truncate">{t("common.load_error")}</span>
          <Button variant="outline" size="sm" onClick={() => { void refetch(); }}>
            <RotateCw />
            {t("common.retry")}
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="equipment" className="flex-1 sm:flex-none">
              {t("project_detail.tab_equipment")}
              {totalItems > 0 && <TabCount>{showPack ? `${packedItems}/${totalItems}` : totalItems}</TabCount>}
            </TabsTrigger>
            <TabsTrigger value="todos" className="flex-1 sm:flex-none">
              {t("project_detail.tab_todos")}
              {todos.length > 0 && <TabCount>{doneTodos}/{todos.length}</TabCount>}
            </TabsTrigger>
            <TabsTrigger value="dmx" className="flex-1 sm:flex-none">{t("project_detail.tab_dmx")}</TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="mt-4">
            <EquipmentTab
              projectId={id}
              status={project.status}
              isReadonly={isReadonly}
              packageGroups={packageGroups}
              directItems={directItems}
              totalItems={totalItems}
              packedItems={packedItems}
              packages={packages}
              availableInventory={availableInventory}
              conflicts={conflicts}
              onAddPackage={handleAddPackage}
              onRemovePackage={detail.removePackageFromProject}
              onAddItem={detail.addDirectItem}
              onRemoveItem={detail.removeItem}
              onUpdateQuantity={detail.updateItemQuantity}
              onTogglePacked={(itemId, packed) => { void detail.togglePacked(itemId, packed); }}
              onConditionChange={(itemId, c) => { void detail.setItemCondition(itemId, c); }}
              onMarkInUse={detail.markItemsInUse}
            />
          </TabsContent>

          <TabsContent value="todos" className="mt-4">
            <TodosTab
              todos={todos}
              status={project.status}
              isReadonly={isReadonly}
              onAdd={detail.addTodo}
              onAddMany={detail.addTodos}
              onToggle={(todoId, done) => { void detail.toggleTodo(todoId, done); }}
              onDelete={todoId => { void detail.deleteTodo(todoId); }}
              onReorder={reordered => { void detail.reorderTodos(reordered); }}
            />
          </TabsContent>

          <TabsContent value="dmx" className="mt-4 min-w-0">
            <ProjectDMXTab projectId={id} projectName={project.name} allItems={allItems} isReadonly={isReadonly} />
          </TabsContent>
        </Tabs>

        <ProjectInfoPanel
          project={project}
          showPackStatus={showPack}
          totalItems={totalItems}
          packedItems={packedItems}
          conflictCount={Object.keys(conflicts).length}
          showConflicts={!isReadonly}
        />
      </div>

      {!isReadonly && (
        <ProjectEditDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initial={{
            name: project.name,
            description: project.description ?? "",
            location: project.location ?? "",
            dateStart: project.event_date_start,
            dateEnd: project.event_date_end,
            notes: project.notes ?? "",
          }}
          onSubmit={handleEdit}
        />
      )}

      <FinalizeProjectDialog
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        onDone={() => navigate("/projects")}
        projectName={project.name}
        allItems={allItems}
        onFinalize={finalize}
        onOpenReport={() => { setFinalizeOpen(false); setReportOpen(true); }}
      />

      <ProjectReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        project={project}
        packageGroups={packageGroups}
        directItems={directItems}
        allItems={allItems}
        todos={todos}
        conditions={conditions}
        conflicts={conflicts}
      />

      <ProjectConfirmDialogs
        pendingStatus={pendingStatus}
        onCancelStatus={() => setPendingStatus(null)}
        onConfirmStatus={to => { setPendingStatus(null); void detail.updateStatus(to); }}
        deleteOpen={deleteOpen}
        onDeleteOpenChange={setDeleteOpen}
        onConfirmDelete={handleDelete}
      />
    </>
  );
}
