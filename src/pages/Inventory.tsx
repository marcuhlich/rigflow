import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, CheckSquare, Square, Download, FileText, Package,
  Printer, Table2, LayoutGrid, List, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterBar } from "@/components/FilterBar";
import { InventoryGrid } from "@/components/InventoryGrid";
import { InventoryTable } from "@/components/InventoryTable";
import { ItemForm } from "@/components/ItemForm";
import { BatchActionsBar } from "@/components/BatchActionsBar";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { useInventory } from "@/hooks/useInventory";
import { useCategories } from "@/hooks/useCategories";
import { useInventoryHistory } from "@/hooks/useInventoryHistory";
import { useUndoRedoContext } from "@/contexts/UndoRedoContext";
import { InventoryItem } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { exportInventoryAsCSV, exportInventoryAsPDF, downloadCSV } from "@/lib/exportUtils";
import { printInventory } from "@/lib/printUtils";
import { useGoogleSheets } from "@/hooks/useGoogleSheets";
import { useSearchParams } from "react-router-dom";
import { ItemCategory, ItemCondition } from "@/types/inventory";
import { useLendingHistory } from "@/hooks/useLendingHistory";
import { hapticFeedback } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { TrashDrawer } from "@/components/TrashDrawer";
import { ToastAction } from "@/components/ui/toast";
import { useTranslation } from "react-i18next";

type ViewMode = "grid" | "table";

export default function Inventory() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [trashOpen, setTrashOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { categoryNames, dmxCategories, categories } = useCategories();
  const history = useInventoryHistory();
  const undoRedoCtx = useUndoRedoContext();

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isMobile]);

  const handleExportCSV = () => {
    const csv = exportInventoryAsCSV(items);
    downloadCSV(csv, `inventar-${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: t("inventory.export_success_title"), description: t("inventory.export_csv_description") });
  };
  const handleExportPDF = () => {
    exportInventoryAsPDF(items);
    toast({ title: t("inventory.export_success_title"), description: t("inventory.export_pdf_description") });
  };
  const handlePrint = () => printInventory(items);
  const { exportToSheets, isExporting } = useGoogleSheets();
  const { addRecord } = useLendingHistory();

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
  } = useInventory();

  const didInitFromUrl = useRef(false);
  useEffect(() => {
    if (didInitFromUrl.current) return;
    didInitFromUrl.current = true;
    const search   = searchParams.get("search")   || "";
    const category = searchParams.get("category") || "all";
    const filter   = searchParams.get("filter")   || "all";
    const location = searchParams.get("location") || "all";
    if (search)             setSearchQuery(search);
    if (category !== "all") setCategoryFilter(category as ItemCategory);
    if (filter   !== "all") setConditionFilter(filter as ItemCondition);
    if (location !== "all") setLocationFilter(location);
  }, []);

  const updateSearchParams = useCallback((patch: Record<string, string>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === "" || value === "all") next.delete(key);
        else next.set(key, value);
      });
      return next;
    });
  }, [setSearchParams]);

  const [contentVisible, setContentVisible] = useState(true);

  const handleViewChange = (next: ViewMode) => {
    if (next === viewMode) return;
    setContentVisible(false);
    setTimeout(() => { setViewMode(next); setContentVisible(true); }, 150);
  };

  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) return;
    if (action === "toggle-view") {
      setViewMode(prev => prev === "grid" ? "table" : "grid");
    } else if (action === "toggle-selection") {
      setSelectionMode(prev => !prev);
    }
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("action");
    navigate({ search: newParams.toString() }, { replace: true });
  }, [searchParams, navigate]);

  const handleExportSheets = async () => {
    try {
      await exportToSheets(items as any);
      toast({ title: t("inventory.export_success_title"), description: t("inventory.export_sheets_description") });
    } catch {
      toast({ title: t("inventory.export_failed_title"), description: t("inventory.export_failed_description"), variant: "destructive" });
    }
  };

  const handleAddClick = () => { setEditItem(null); setIsFormOpen(true); };
  const handleEditClick = (item: InventoryItem) => { setEditItem(item); setIsFormOpen(true); };

  const handleDeleteClick = async (id: string) => {
    const item = items.find((i) => i.id === id) || allItems.find((i) => i.id === id);
    try {
      await deleteItem(id);
      if (item) history.pushAction({ type: "delete", item });
      hapticFeedback(100);
      toast({
        title: t("inventory.moved_to_trash_title"),
        description: t("inventory.moved_to_trash_description", { name: item?.name }),
        action: (
          <ToastAction altText={t("undo_redo.undo")} onClick={() => handleUndoRef.current()}>
            {t("undo_redo.undo")}
          </ToastAction>
        ),
      });
    } catch { /* handled in hook */ }
  };

  const handleViewDetails = (id: string) => navigate(`/inventory/${id}`);

  const handleFormSubmit = async (data: Omit<InventoryItem, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (editItem) {
      if (data.condition === 'verliehen' && editItem.condition !== 'verliehen' && data.lent_to) {
        await addRecord({
          item_id: editItem.id, item_name: data.name, lent_to: data.lent_to,
          lent_at: new Date().toISOString().split('T')[0],
          due_date: data.lent_until || null, returned_at: null, notes: null,
        });
      }
      await updateItem(editItem.id, data);
      const newItem = { ...editItem, ...data, updated_at: new Date().toISOString() };
      history.pushAction({ type: "update", oldItem: editItem, newItem });
      toast({ title: t("inventory.updated_title"), description: t("inventory.updated_description") });
    } else {
      await addItem(data);
      const latestItem = allItems[0];
      if (latestItem && data.condition === 'verliehen' && data.lent_to) {
        await addRecord({
          item_id: latestItem.id, item_name: data.name, lent_to: data.lent_to,
          lent_at: new Date().toISOString().split('T')[0],
          due_date: data.lent_until || null, returned_at: null, notes: null,
        });
      }
      if (latestItem) history.pushAction({ type: "add", item: latestItem });
      toast({ title: t("inventory.added_title"), description: t("inventory.added_description") });
    }
  };

  const handleUndo = useCallback(async () => {
    const action = history.undo();
    if (!action) return;
    try {
      switch (action.type) {
        case "add":
          await deleteItem(action.item.id);
          toast({ title: t("undo_redo.undo"), description: t("inventory.undo_add_description", { name: action.item.name }) });
          break;
        case "update": {
          const { id, user_id, created_at, updated_at, ...oldData } = action.oldItem;
          await updateItem(action.oldItem.id, oldData as any);
          toast({ title: t("undo_redo.undo"), description: t("inventory.undo_update_description", { name: action.oldItem.name }) });
          break;
        }
        case "delete":
          await restoreItem(action.item.id);
          toast({ title: t("undo_redo.undo"), description: t("inventory.undo_delete_description", { name: action.item.name }) });
          break;
      }
    } catch { history.pushAction(action); }
  }, [history, deleteItem, updateItem, addItem, restoreItem, toast, t]);

  const handleRedo = useCallback(async () => {
    const action = history.redo();
    if (!action) return;
    try {
      switch (action.type) {
        case "add": {
          const { id, user_id, created_at, updated_at, ...itemData } = action.item;
          await addItem(itemData as any);
          toast({ title: t("undo_redo.redo"), description: t("inventory.redo_add_description", { name: action.item.name }) });
          break;
        }
        case "update": {
          const { id, user_id, created_at, updated_at, ...newData } = action.newItem;
          await updateItem(action.newItem.id, newData as any);
          toast({ title: t("undo_redo.redo"), description: t("inventory.redo_update_description", { name: action.newItem.name }) });
          break;
        }
        case "delete":
          await deleteItem(action.item.id);
          toast({ title: t("undo_redo.redo"), description: t("inventory.redo_delete_description", { name: action.item.name }) });
          break;
      }
    } catch { /* failed redo */ }
  }, [history, deleteItem, updateItem, addItem, toast, t]);

  const handleUndoRef = useRef(handleUndo);
  const handleRedoRef = useRef(handleRedo);
  useEffect(() => { handleUndoRef.current = handleUndo; }, [handleUndo]);
  useEffect(() => { handleRedoRef.current = handleRedo; }, [handleRedo]);

  useEffect(() => {
    undoRedoCtx.register({
      canUndo: history.canUndo, canRedo: history.canRedo,
      onUndo: () => handleUndoRef.current(),
      onRedo: () => handleRedoRef.current(),
    });
  }, [history.canUndo, history.canRedo]);

  useEffect(() => () => undoRedoCtx.unregister(), []);

  const toggleSelectionMode = () => {
    if (selectionMode) clearSelection();
    setSelectionMode(!selectionMode);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isTyping = document.activeElement?.tagName === "INPUT" ||
                       document.activeElement?.tagName === "TEXTAREA";
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); handleRedo(); }
      if (isTyping) return;
      if (e.key === "f" || e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "n" || e.key === "+") { e.preventDefault(); handleAddClick(); }
      if (e.key === "v") setViewMode(prev => prev === "grid" ? "table" : "grid");
      if (e.key === "m") toggleSelectionMode();
      if (e.key === "Escape") { clearFilters(); if (selectionMode) toggleSelectionMode(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo, selectionMode, toggleSelectionMode, clearFilters]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-5 pb-24">
      <PageHeader
        title={t("nav.inventory")}
        description={t("inventory.items_found", { count: items.length })}
        icon={Package}
        actions={
          <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto flex-wrap">
            {!isMobile && (
              <div className="flex rounded-md border border-border overflow-hidden h-9">
                <button
                  onClick={() => handleViewChange("grid")}
                  className={`px-2.5 flex items-center transition-all active:scale-95 ${
                    viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                  title={t("inventory.grid_view")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleViewChange("table")}
                  className={`px-2.5 flex items-center border-l border-border transition-all active:scale-95 ${
                    viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                  title={t("inventory.list_view")}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            )}

            <Button
              variant={selectionMode ? "default" : "outline"}
              onClick={toggleSelectionMode}
              className="gap-1 flex-1 sm:flex-none px-2 sm:px-4 h-9 text-xs sm:text-sm active:scale-95"
            >
              {selectionMode
                ? <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                : <Square className="h-3.5 w-3.5 shrink-0" />
              }
              <span className="hidden sm:inline">
                {selectionMode ? t("inventory.end_selection") : t("inventory.multi_select")}
              </span>
              <span className="sm:hidden">
                {selectionMode ? t("inventory.done") : t("inventory.select")}
              </span>
            </Button>

            <Button
              onClick={handleAddClick}
              className="gap-1 flex-1 sm:flex-none px-2 sm:px-4 h-9 text-xs sm:text-sm active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{t("inventory.new_item")}</span>
              <span className="sm:hidden">{t("inventory.item_short")}</span>
            </Button>

            {!isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 h-9 text-xs sm:text-sm">
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t("common.export")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="h-4 w-4 mr-2" /> {t("inventory.export_csv")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText className="h-4 w-4 mr-2" /> {t("inventory.export_pdf")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportSheets} disabled={isExporting}>
                    <Table2 className="h-4 w-4 mr-2" />
                    {isExporting ? t("inventory.exporting") : t("inventory.export_sheets")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" /> {t("common.print")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9 text-xs sm:text-sm relative active:scale-95"
              onClick={() => setTrashOpen(true)}
              title={t("trash.title")}
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t("trash.title")}</span>
              {trashedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-muted-foreground/50" />
              )}
            </Button>
          </div>
        }
      />

      {selectionMode && items.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" onClick={selectAll} className="h-8 text-xs">
            {t("inventory.select_all_count", { count: items.length })}
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 text-xs">
              {t("inventory.clear_selection")}
            </Button>
          )}
        </div>
      )}

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(value) => { setSearchQuery(value); updateSearchParams({ search: value }); }}
        categoryFilter={categoryFilter}
        onCategoryChange={(value) => { setCategoryFilter(value); updateSearchParams({ category: value }); }}
        conditionFilter={conditionFilter}
        onConditionChange={(value) => { setConditionFilter(value); updateSearchParams({ filter: value }); }}
        locationFilter={locationFilter}
        onLocationChange={(value) => { setLocationFilter(value); updateSearchParams({ location: value }); }}
        onClearFilters={() => { clearFilters(); setSearchParams({}); }}
        locations={locations}
        categories={categories}
        searchRef={searchRef}
        tagFilter={tagFilter}
        onTagChange={setTagFilter}
        availableTags={availableTags}
      />

      <div style={{
        opacity: contentVisible ? 1 : 0,
        transform: contentVisible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 150ms ease, transform 150ms ease",
      }}>
        {viewMode === "grid" || isMobile ? (
          <InventoryGrid
            items={items}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onViewDetails={handleViewDetails}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            selectionMode={selectionMode}
            onUpdateItem={updateItem}
            onAddItem={addItem}
            onFilterCategory={(cat) => setCategoryFilter(cat)}
            searchQuery={searchQuery}
            hasActiveFilters={categoryFilter !== "all" || conditionFilter !== "all" || locationFilter !== "all" || tagFilter !== "all"}
            onAddItemClick={handleAddClick}
            onClearFilters={clearFilters}
            onClearSearch={() => setSearchQuery("")}
            onEnterSelectionMode={(firstId) => { setSelectionMode(true); toggleSelection(firstId); }}
          />
        ) : (
          <InventoryTable
            items={items}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onViewDetails={handleViewDetails}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            selectionMode={selectionMode}
            onUpdateItem={updateItem}
            onAddItem={addItem}
            onFilterCategory={(cat) => setCategoryFilter(cat)}
            searchQuery={searchQuery}
            hasActiveFilters={categoryFilter !== "all" || conditionFilter !== "all" || locationFilter !== "all" || tagFilter !== "all"}
            onAddItemClick={handleAddClick}
            onClearFilters={clearFilters}
            onClearSearch={() => setSearchQuery("")}
          />
        )}
      </div>

      <AuditLogPanel />

      <ItemForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        editItem={editItem}
        categories={categories}
      />

      <BatchActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={() => { clearSelection(); setSelectionMode(false); }}
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
      />
    </div>
  );
}