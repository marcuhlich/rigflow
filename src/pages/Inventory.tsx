import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState, ListSkeleton } from "@/components/QueryState";
import { FilterBar } from "@/components/FilterBar";
import { InventoryGrid } from "@/components/InventoryGrid";
import { InventoryTable } from "@/components/InventoryTable";
import { EmptyState } from "@/components/EmptyState";
import { ItemForm } from "@/components/ItemForm";
import { BatchActionsBar } from "@/components/BatchActionsBar";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { TrashDrawer } from "@/components/TrashDrawer";
import { InventoryMobileList } from "@/components/inventory/InventoryMobileList";
import { InventoryTableSkeleton } from "@/components/inventory/InventoryTableSkeleton";
import {
  InventoryHeaderActions, ViewModeToggle, type ViewMode,
} from "@/components/inventory/InventoryHeaderActions";
import { useInventoryUndo } from "@/components/inventory/useInventoryUndo";
import { useInventoryShortcuts } from "@/components/inventory/useInventoryShortcuts";
import { useInventoryExports } from "@/components/inventory/useInventoryExports";
import type { ItemDraft } from "@/components/inventory/format";
import { useInventory } from "@/hooks/useInventory";
import { useCategories } from "@/hooks/useCategories";
import { useProjects } from "@/hooks/useProjects";
import { useLendingHistory } from "@/hooks/useLendingHistory";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { hapticFeedback } from "@/lib/utils";
import { CONDITIONS, InventoryItem, ItemCategory, ItemCondition } from "@/types/inventory";

const VIEW_STORAGE_KEY = "rigflow.inventory.view";

function readStoredView(): ViewMode {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === "grid" ? "grid" : "table";
  } catch {
    return "table";
  }
}

const today = () => new Date().toISOString().split("T")[0];

export default function Inventory() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewMode, setViewModeState] = useState<ViewMode>(readStoredView);
  const [trashOpen, setTrashOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { categories } = useCategories();
  const { projects } = useProjects();
  const { addRecord } = useLendingHistory();

  const inventory = useInventory();
  const {
    items, allItems, loading, refetch,
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    conditionFilter, setConditionFilter,
    locationFilter, setLocationFilter,
    locations, clearFilters,
    addItem, updateItem, deleteItem,
    selectedIds, toggleSelection, selectAll, clearSelection,
    isProcessing, batchUpdateCondition, batchUpdateLocation, batchDelete,
    trashedItems, trashedCount, fetchTrashedItems, restoreItem, permanentlyDeleteItem, emptyTrash,
    tagFilter, setTagFilter, availableTags,
  } = inventory;
  // `error` is not part of the hook's public type yet; read it defensively so a load failure
  // shows an ErrorState instead of a misleading "no items yet" panel once the hook exposes it.
  const loadError = (inventory as unknown as { error?: unknown }).error ?? null;

  // Latest items for code that runs after an await (avoids stale closures).
  const allItemsRef = useRef(allItems);
  useEffect(() => { allItemsRef.current = allItems; }, [allItems]);

  const exports = useInventoryExports(items);
  const { pushAction, undo, redo } = useInventoryUndo({ addItem, updateItem, deleteItem, restoreItem });

  const setViewMode = useCallback((next: ViewMode | ((prev: ViewMode) => ViewMode)) => {
    setViewModeState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      try { localStorage.setItem(VIEW_STORAGE_KEY, value); } catch { /* private mode */ }
      return value;
    });
  }, []);

  // ── URL ⇄ filters ─────────────────────────────────────────────────────────
  const didInitFromUrl = useRef(false);
  useEffect(() => {
    if (didInitFromUrl.current) return;
    didInitFromUrl.current = true;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "all";
    const filter = searchParams.get("filter") || "all";
    const location = searchParams.get("location") || "all";
    if (search) setSearchQuery(search);
    if (category !== "all") setCategoryFilter(category as ItemCategory);
    if (filter !== "all" && (CONDITIONS as string[]).includes(filter)) setConditionFilter(filter as ItemCondition);
    if (location !== "all") setLocationFilter(location);
  }, [searchParams, setSearchQuery, setCategoryFilter, setConditionFilter, setLocationFilter]);

  const updateSearchParams = useCallback((patch: Record<string, string>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === "" || value === "all") next.delete(key);
        else next.set(key, value);
      });
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const changeSearch = (value: string) => { setSearchQuery(value); updateSearchParams({ search: value }); };
  const changeCategory = (value: ItemCategory | "all") => { setCategoryFilter(value); updateSearchParams({ category: value }); };
  const changeCondition = (value: ItemCondition | "all") => { setConditionFilter(value); updateSearchParams({ filter: value }); };
  const changeLocation = (value: string) => { setLocationFilter(value); updateSearchParams({ location: value }); };
  const resetFilters = () => {
    clearFilters();
    updateSearchParams({ search: "", category: "", filter: "", location: "" });
  };

  // Command-palette actions arrive as ?action=…
  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) return;
    if (action === "toggle-view") setViewMode((prev) => (prev === "grid" ? "table" : "grid"));
    else if (action === "toggle-selection") setSelectionMode((prev) => !prev);
    else if (action === "new-item") { setEditItem(null); setIsFormOpen(true); }
    const next = new URLSearchParams(searchParams);
    next.delete("action");
    navigate({ search: next.toString() }, { replace: true });
  }, [searchParams, navigate, setViewMode]);

  // Focus search on desktop when the page opens.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 100);
    return () => window.clearTimeout(id);
  }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleAddClick = useCallback(() => { setEditItem(null); setIsFormOpen(true); }, []);
  const handleEditClick = useCallback((item: InventoryItem) => { setEditItem(item); setIsFormOpen(true); }, []);
  const handleViewDetails = useCallback((id: string) => navigate(`/inventory/${id}`), [navigate]);

  const handleDeleteClick = async (id: string) => {
    const item = allItemsRef.current.find((i) => i.id === id);
    try {
      await deleteItem(id);
    } catch {
      return; // error toast shown by useInventory
    }
    if (item) pushAction({ type: "delete", item });
    hapticFeedback(100);
    toast({
      title: t("inventory.moved_to_trash_title"),
      description: t("inventory.moved_to_trash_description", { name: item?.name ?? "" }),
      action: (
        <ToastAction altText={t("undo_redo.undo")} onClick={() => void undo()}>
          {t("undo_redo.undo")}
        </ToastAction>
      ),
    });
  };

  const createLendingRecord = (itemId: string, data: ItemDraft) =>
    addRecord({
      item_id: itemId, item_name: data.name, lent_to: data.lent_to ?? "",
      lent_at: today(), due_date: data.lent_until || null, returned_at: null, notes: null,
    });

  /** Errors propagate to ItemForm so the dialog stays open. */
  const handleFormSubmit = async (data: ItemDraft) => {
    if (editItem) {
      if (data.condition === "verliehen" && editItem.condition !== "verliehen" && data.lent_to) {
        await createLendingRecord(editItem.id, data);
      }
      await updateItem(editItem.id, data);
      pushAction({ type: "update", oldItem: editItem, newItem: { ...editItem, ...data, updated_at: new Date().toISOString() } });
      toast({ title: t("inventory.updated_title"), description: t("inventory.updated_description") });
      return;
    }

    const knownIds = new Set(allItemsRef.current.map((i) => i.id));
    const result: unknown = await addItem(data);
    // Prefer the created row if the hook returns it; otherwise find the new row by diffing.
    const created =
      result && typeof result === "object" && "id" in result
        ? (result as InventoryItem)
        : allItemsRef.current.find((i) => !knownIds.has(i.id) && i.name === data.name);

    if (created) {
      if (data.condition === "verliehen" && data.lent_to) await createLendingRecord(created.id, data);
      pushAction({ type: "add", item: created });
    }
    toast({ title: t("inventory.added_title"), description: t("inventory.added_description") });
  };

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) clearSelection();
      return !prev;
    });
  }, [clearSelection]);

  const exitSelection = () => { clearSelection(); setSelectionMode(false); };

  const enterSelectionMode = useCallback((firstId: string) => {
    setSelectionMode(true);
    toggleSelection(firstId);
  }, [toggleSelection]);

  useInventoryShortcuts({
    undo: () => void undo(),
    redo: () => void redo(),
    focusSearch: () => searchRef.current?.focus(),
    addItem: handleAddClick,
    toggleView: () => setViewMode((prev) => (prev === "grid" ? "table" : "grid")),
    toggleSelectionMode,
    escape: () => {
      if (selectedIds.size > 0 || selectionMode) exitSelection();
      else resetFilters();
    },
  }, !isFormOpen && !trashOpen);

  // ── Render ────────────────────────────────────────────────────────────────
  const hasActiveFilters =
    categoryFilter !== "all" || conditionFilter !== "all" || locationFilter !== "all" || tagFilter !== "all";
  const batchVisible = selectedIds.size > 0 || selectionMode;
  const showTable = !isMobile && viewMode === "table";
  const onFilterCategory = (cat: string) => changeCategory(cat);

  const renderContent = () => {
    if (loading && allItems.length === 0) {
      return isMobile ? <ListSkeleton rows={8} /> : <InventoryTableSkeleton />;
    }
    if (loadError && allItems.length === 0) {
      return <ErrorState error={loadError} onRetry={() => void refetch()} />;
    }
    if (items.length === 0) {
      if (searchQuery.trim()) {
        return <EmptyState variant="search" searchQuery={searchQuery} onClearSearch={() => changeSearch("")} />;
      }
      if (hasActiveFilters) return <EmptyState variant="filtered" onClearFilters={resetFilters} />;
      return <EmptyState variant="empty" onAddItem={handleAddClick} />;
    }
    if (isMobile) {
      return (
        <InventoryMobileList
          items={items}
          selectedIds={selectedIds}
          selectionMode={selectionMode}
          onToggleSelection={toggleSelection}
          onViewDetails={handleViewDetails}
          onEnterSelectionMode={enterSelectionMode}
          categories={categories}
        />
      );
    }
    if (showTable) {
      return (
        <InventoryTable
          items={items}
          onEdit={handleEditClick}
          onDelete={(id) => void handleDeleteClick(id)}
          onViewDetails={handleViewDetails}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          selectionMode={selectionMode}
          onUpdateItem={updateItem}
          onAddItem={addItem}
          onFilterCategory={onFilterCategory}
          categories={categories}
          projects={projects}
        />
      );
    }
    return (
      <InventoryGrid
        items={items}
        onEdit={handleEditClick}
        onDelete={(id) => void handleDeleteClick(id)}
        onViewDetails={handleViewDetails}
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
        selectionMode={selectionMode}
        onUpdateItem={updateItem}
        onAddItem={addItem}
        onFilterCategory={onFilterCategory}
        onEnterSelectionMode={enterSelectionMode}
        categories={categories}
        projects={projects}
      />
    );
  };

  return (
    <div className={batchVisible ? "pb-28 lg:pb-20" : undefined}>
      <PageHeader
        title={t("nav.inventory")}
        description={
          loading && allItems.length === 0 ? undefined : (
            <span className="tabular-nums">{t("inventory.items_found", { count: items.length })}</span>
          )
        }
        actions={
          <InventoryHeaderActions
            isMobile={isMobile}
            trashedCount={trashedCount}
            isExporting={exports.isExporting}
            selectionMode={selectionMode}
            onAdd={handleAddClick}
            onOpenTrash={() => setTrashOpen(true)}
            onToggleSelectionMode={toggleSelectionMode}
            onExportCSV={exports.exportCSV}
            onExportPDF={exports.exportPDF}
            onExportSheets={() => void exports.exportSheets()}
            onPrint={exports.print}
          />
        }
      />

      <div className="space-y-3">
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={changeSearch}
          categoryFilter={categoryFilter}
          onCategoryChange={changeCategory}
          conditionFilter={conditionFilter}
          onConditionChange={changeCondition}
          locationFilter={locationFilter}
          onLocationChange={changeLocation}
          onClearFilters={resetFilters}
          locations={locations}
          categories={categories}
          searchRef={searchRef}
          tagFilter={tagFilter}
          onTagChange={setTagFilter}
          availableTags={availableTags}
          trailing={
            !isMobile && (
              <>
                {viewMode === "grid" && (
                  <Button
                    variant={selectionMode ? "secondary" : "ghost"}
                    onClick={toggleSelectionMode}
                    aria-pressed={selectionMode}
                  >
                    <CheckSquare />
                    {selectionMode ? t("inventory.end_selection") : t("inventory.multi_select")}
                  </Button>
                )}
                <ViewModeToggle value={viewMode} onChange={setViewMode} />
              </>
            )
          }
        />

        {renderContent()}
      </div>

      <div className="mt-8">
        <AuditLogPanel />
      </div>

      <ItemForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        editItem={editItem}
        categories={categories}
      />

      <BatchActionsBar
        selectedCount={selectedIds.size}
        totalCount={items.length}
        onSelectAll={selectAll}
        forceVisible={selectionMode}
        onClearSelection={exitSelection}
        onBatchUpdateCondition={batchUpdateCondition}
        onBatchUpdateLocation={batchUpdateLocation}
        onBatchDelete={batchDelete}
        locations={locations}
        isProcessing={isProcessing}
      />

      <TrashDrawer
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        trashedItems={trashedItems}
        onFetch={fetchTrashedItems}
        onRestore={restoreItem}
        onPermanentDelete={permanentlyDeleteItem}
        onEmptyTrash={emptyTrash}
        categories={categories}
      />
    </div>
  );
}
