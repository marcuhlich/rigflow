import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layers, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyPanel, ErrorState, ListSkeleton } from "@/components/QueryState";
import { PageHeader } from "@/components/PageHeader";
import { PackageFormData, PackageFormDialog } from "@/components/packages/PackageFormDialog";
import { PackageList } from "@/components/packages/PackageList";
import { PackageEditorSheet } from "@/components/packages/PackageEditorSheet";
import { deletePackageUsages } from "@/components/packages/deletePackageUsages";
import { usePackages } from "@/hooks/usePackages";
import { useToast } from "@/hooks/use-toast";
import { PackageWithItems } from "@/types/project";

interface PackagesPageProps {
  /** When true the page renders without its own PageHeader (used as a tab in Projects). */
  embedded?: boolean;
}

export default function PackagesPage({ embedded = false }: PackagesPageProps) {
  const packagesState = usePackages();
  const {
    packages, loading, inventoryItems, refetch,
    createPackage, updatePackage, deletePackage,
    addItemToPackage, updatePackageItemQuantity,
    removeItemFromPackage, reorderPackageItems,
  } = packagesState;
  // Forward-compatible: shows the error panel as soon as the hook exposes `error`.
  const loadError = "error" in packagesState ? packagesState.error : null;
  const { toast } = useToast();
  const { t } = useTranslation();

  const [formOpen, setFormOpen]         = useState(false);
  const [editPkg, setEditPkg]           = useState<PackageWithItems | null>(null);
  const [editOpen, setEditOpen]         = useState(false);
  const [editorId, setEditorId]         = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PackageWithItems | null>(null);
  const [search, setSearch]             = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(p =>
      p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q),
    );
  }, [packages, search]);

  // The editor always reads fresh data from the hook.
  const editorData = editorId ? packages.find(p => p.id === editorId) ?? null : null;

  const handleCreate = async (data: PackageFormData) => {
    await createPackage(data);
    toast({ title: t("packages.created_title"), description: t("packages.created_desc", { name: data.name }) });
  };

  const handleUpdate = async (data: PackageFormData) => {
    if (!editPkg) return;
    await updatePackage(editPkg.id, data);
    toast({ title: t("packages.updated_title") });
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      await deletePackageUsages(target.id);
    } catch {
      toast({ title: t("common.error"), description: t("packages.delete_error"), variant: "destructive" });
      return;
    }
    try {
      await deletePackage(target.id);
    } catch {
      return; // usePackages toasts
    }
    if (editorId === target.id) setEditorId(null);
    toast({ title: t("packages.deleted_title") });
  };

  const renderList = () => {
    if (loading && packages.length === 0) return <ListSkeleton rows={4} />;
    if (loadError && packages.length === 0) return <ErrorState error={loadError} onRetry={() => void refetch()} />;
    if (packages.length === 0) {
      return (
        <EmptyPanel
          icon={Layers}
          title={t("packages.no_packages")}
          description={t("packages.no_packages_desc")}
          action={
            <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              <Plus />
              {t("packages.btn_first")}
            </Button>
          }
        />
      );
    }
    if (filtered.length === 0) {
      return (
        <EmptyPanel
          icon={Search}
          title={t("packages.no_search_results", { search: search.trim() })}
          action={
            <Button size="sm" variant="outline" onClick={() => setSearch("")}>
              {t("common.reset")}
            </Button>
          }
        />
      );
    }
    return (
      <PackageList
        packages={filtered}
        onOpen={pkg => setEditorId(pkg.id)}
        onEdit={pkg => { setEditPkg(pkg); setEditOpen(true); }}
        onDelete={setDeleteTarget}
      />
    );
  };

  return (
    <div className="space-y-3">
      {!embedded && <PageHeader title={t("packages.title")} description={t("packages.description")} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label={t("common.search")}
            placeholder={t("packages.search_placeholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setFormOpen(true)} className="ml-auto">
          <Plus />
          {t("packages.btn_new")}
        </Button>
      </div>

      {packages.length > 0 && (
        <p className="text-[13px] text-muted-foreground">{t("packages.packages_description")}</p>
      )}

      {renderList()}

      <PackageFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleCreate} />

      <PackageFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        initial={editPkg ? {
          name:        editPkg.name,
          description: editPkg.description ?? "",
          color:       editPkg.color,
          icon:        editPkg.icon,
        } : undefined}
      />

      <PackageEditorSheet
        pkg={editorData}
        open={!!editorId}
        onClose={() => setEditorId(null)}
        inventoryItems={inventoryItems}
        onAddItem={(packageId, itemId) => addItemToPackage(packageId, itemId, 1)}
        onRemoveItem={removeItemFromPackage}
        onQtyChange={updatePackageItemQuantity}
        onReorder={reorderPackageItems}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("packages.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("packages.delete_description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("packages.delete_button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
