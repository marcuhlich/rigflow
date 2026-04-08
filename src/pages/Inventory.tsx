import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, CheckSquare, Square, Download, FileText, Package,
  Printer, Table2, LayoutGrid, List, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { FilterBar } from "@/components/FilterBar";
import { InventoryGrid } from "@/components/InventoryGrid";
import { InventoryTable } from "@/components/InventoryTable";
import { ItemForm } from "@/components/ItemForm";
import { EnhancedQRScanner } from "@/components/EnhancedQRScanner";
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
import { useEventSets } from "@/hooks/useEventSets";
import { PullToRefreshWrapper } from "@/components/PullToRefreshWrapper";
import { TrashDrawer } from "@/components/TrashDrawer";
import { ToastAction } from "@/components/ui/toast";

type ViewMode = "grid" | "table";

export default function Inventory() {
  const navigate = useNavigate();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchQuery = searchParams.get("search") || "";
  const initialCategory = (searchParams.get("category") as ItemCategory) || "all";
  const initialCondition = (searchParams.get("filter") as ItemCondition) || "all";
  const initialLocation = searchParams.get("location") || "all";

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
  const { sets, addItemToSet } = useEventSets();
  const { refetch } = useInventory();
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;


  // Autofocus Suchfeld auf Desktop
  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (!isMobile) {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [isMobile]);

  const handleExportCSV = () => {
    const csv = exportInventoryAsCSV(items);
    downloadCSV(csv, `inventar-${new Date().toISOString().split("T")[0]}.csv`);
    toast({ title: "Export erfolgreich", description: "CSV-Datei wurde heruntergeladen." });
  };
  const handleExportPDF = () => {
    exportInventoryAsPDF(items);
    toast({ title: "Export erfolgreich", description: "PDF-Datei wurde heruntergeladen." });
  };
  const handlePrint = () => printInventory(items);
  const { exportToSheets, isExporting } = useGoogleSheets();
  const { addRecord } = useLendingHistory();

  const {
    items, allItems, loading,
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    conditionFilter, setConditionFilter,
    locationFilter, setLocationFilter,
    locations, clearFilters,
    addItem, updateItem, deleteItem,
    selectedIds, toggleSelection, selectAll, clearSelection,
    isProcessing, batchUpdateCondition, batchUpdateLocation, batchDelete,
    // Papierkorb:
    trashedItems, trashedCount, fetchTrashedItems, restoreItem, permanentlyDeleteItem, emptyTrash,
    tagFilter, setTagFilter, availableTags,
  } = useInventory();

    useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
    setCategoryFilter(searchParams.get("category") as ItemCategory || "all");
    setConditionFilter(searchParams.get("filter") as ItemCondition || "all");
    setLocationFilter(searchParams.get("location") || "all");
  }, [searchParams, setSearchQuery, setCategoryFilter, setConditionFilter, setLocationFilter]);

  // Führe Aktionen aus, die von der CommandPalette via URL-Parameter signalisiert werden
  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) return;

    if (action === "toggle-view") {
      setViewMode(prev => prev === "grid" ? "table" : "grid");
    } else if (action === "toggle-selection") {
      setSelectionMode(prev => !prev);
    }

    // Entferne den action-Parameter aus der URL, um zu verhindern, dass die Aktion mehrfach ausgeführt wird
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("action");
    navigate({ search: newParams.toString() }, { replace: true });
  }, [searchParams, navigate]);

    const filteredItems = allItems.filter(item => {
    return (
      (conditionFilter === "all" || item.condition === conditionFilter) &&
      (categoryFilter === "all" || item.category === categoryFilter) &&
      (locationFilter === "all" || item.location === locationFilter) &&
      (searchQuery === "" || item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleExportSheets = async () => {
    try {
      await exportToSheets(items);
      toast({ title: "Export erfolgreich", description: "Google Sheet wurde geöffnet." });
    } catch {
      toast({ title: "Export fehlgeschlagen", description: "Bitte versuche es erneut.", variant: "destructive" });
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
        title: "In Papierkorb verschoben",
        description: `„${item?.name}" wurde in den Papierkorb verschoben.`,
        action: (
          <ToastAction altText="Rückgängig" onClick={() => handleUndoRef.current()}>
            {/* ↑ statt handleUndo() – Ref zeigt immer auf aktuelle Version */}
            Rückgängig
          </ToastAction>
        ),
      });
    } catch { /* handled in hook */ }
  };

  const handleViewDetails = (id: string) => navigate(`/inventory/${id}`);

  const handleFormSubmit = async (data: Omit<InventoryItem, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (editItem) {
      // Check if transitioning to "verliehen" and not already lent
      if (data.condition === 'verliehen' && editItem.condition !== 'verliehen' && data.lent_to) {
        // Create lending history record
        await addRecord({
          item_id: editItem.id,
          item_name: data.name,
          lent_to: data.lent_to,
          lent_at: new Date().toISOString().split('T')[0],
          due_date: data.lent_until || null,
          returned_at: null,
          notes: null,
        });
      }
      await updateItem(editItem.id, data);
      const newItem = { ...editItem, ...data, updated_at: new Date().toISOString() };
      history.pushAction({ type: "update", oldItem: editItem, newItem });
      toast({ title: "Item aktualisiert", description: "Die Änderungen wurden gespeichert." });
    } else {
      await addItem(data);
      const latestItem = allItems[0];
      // Check if creating as "verliehen"
      if (latestItem && data.condition === 'verliehen' && data.lent_to) {
        // Create lending history record
        await addRecord({
          item_id: latestItem.id,
          item_name: data.name,
          lent_to: data.lent_to,
          lent_at: new Date().toISOString().split('T')[0],
          due_date: data.lent_until || null,
          returned_at: null,
          notes: null,
        });
      }
      if (latestItem) history.pushAction({ type: "add", item: latestItem });
      toast({ title: "Item hinzugefügt", description: "Das neue Item wurde erfolgreich erstellt." });
    }
  };

  const handleUndo = useCallback(async () => {
    const action = history.undo();
    if (!action) return;
    try {
      switch (action.type) {
        case "add":
          await deleteItem(action.item.id);
          toast({ title: "Rückgängig", description: `"${action.item.name}" wurde entfernt.` });
          break;
        case "update": {
          const { id, user_id, created_at, updated_at, ...oldData } = action.oldItem;
          await updateItem(action.oldItem.id, oldData as any);
          toast({ title: "Rückgängig", description: `"${action.oldItem.name}" wurde zurückgesetzt.` });
          break;
        }
        case "delete":
          await restoreItem(action.item.id);  // restoreItem war stale
          toast({ title: "Rückgängig", description: `„${action.item.name}" wurde wiederhergestellt.` });
          break;
      }
    } catch { history.pushAction(action); }
  }, [history, deleteItem, updateItem, addItem, restoreItem, toast]);

  const handleRedo = useCallback(async () => {
    const action = history.redo();
    if (!action) return;
    try {
      switch (action.type) {
        case "add": {
          const { id, user_id, created_at, updated_at, ...itemData } = action.item;
          await addItem(itemData as any);
          toast({ title: "Wiederherstellen", description: `"${action.item.name}" wurde erneut hinzugefügt.` });
          break;
        }
        case "update": {
          const { id, user_id, created_at, updated_at, ...newData } = action.newItem;
          await updateItem(action.newItem.id, newData as any);
          toast({ title: "Wiederherstellen", description: `"${action.newItem.name}" wurde erneut geändert.` });
          break;
        }
        case "delete":
          await deleteItem(action.item.id);
          toast({ title: "Wiederherstellen", description: `"${action.item.name}" wurde erneut gelöscht.` });
          break;
      }
    } catch { /* failed redo */ }
  }, [history, deleteItem, updateItem, addItem, toast]);

  const handleUndoRef = useRef(handleUndo);
  const handleRedoRef = useRef(handleRedo);
  useEffect(() => { handleUndoRef.current = handleUndo; }, [handleUndo]);
  useEffect(() => { handleRedoRef.current = handleRedo; }, [handleRedo]);

  useEffect(() => {
    undoRedoCtx.register({
      canUndo: history.canUndo,
      canRedo: history.canRedo,
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
      // Falls der Nutzer gerade in einem Input-Feld schreibt, 
      // sollen Shortcuts (außer Undo/Redo) nicht triggern.
      const isTyping = document.activeElement?.tagName === "INPUT" || 
                      document.activeElement?.tagName === "TEXTAREA";

      // 1. Undo & Redo (auch während des Tippens sinnvoll)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { 
        e.preventDefault(); 
        handleUndo(); 
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { 
        e.preventDefault(); 
        handleRedo(); 
      }

      // Ab hier: Shortcuts, die nur triggern, wenn man NICHT tippt
      if (isTyping) return;

      // 2. Suche fokussieren (Taste: 'f' oder '/')
      if (e.key === "f" || e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }

      // 3. Neues Item erstellen (Taste: 'n' oder '+')
      if (e.key === "n" || e.key === "+") {
        e.preventDefault();
        handleAddClick();
      }

      // 4. Ansicht wechseln (Taste: 'v' für View)
      if (e.key === "v") {
        setViewMode(prev => prev === "grid" ? "table" : "grid");
      }

      // 5. Auswahlmodus umschalten (Taste: 'm' für Multi-Select)
      if (e.key === "m") {
        toggleSelectionMode();
      }
      
      // 6. Alles schließen / Filter löschen (Taste: 'Escape')
      if (e.key === "Escape") {
        clearFilters();
        if (selectionMode) toggleSelectionMode();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo, selectionMode, toggleSelectionMode, clearFilters]); 
  // WICHTIG: Alle Abhängigkeiten hier im Array aufführen!

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
    <PullToRefreshWrapper
          onRefresh={async () => { await refetch(); }}
          disabled={!isMobile || !isStandalone}
    >
    <div className="space-y-3 sm:space-y-5 pb-24">
    <PageHeader
      title="Inventar"
      description={`${items.length} Artikel gefunden`}
      icon={Package}
      actions={
        <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto flex-wrap">
          {!isMobile && (
            <div className="flex rounded-md border border-border overflow-hidden h-9">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2.5 flex items-center transition-colors ${
                  viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                }`}
                title="Kachelansicht"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-2.5 flex items-center border-l border-border transition-colors ${
                  viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                }`}
                title="Listenansicht"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}
          <Button variant={selectionMode ? "default" : "outline"} onClick={toggleSelectionMode} className="gap-1 flex-1 sm:flex-none px-2 sm:px-4 h-9 text-xs sm:text-sm">
            {selectionMode ? <CheckSquare className="h-3.5 w-3.5 shrink-0" /> : <Square className="h-3.5 w-3.5 shrink-0" />}
            <span className="hidden sm:inline">{selectionMode ? "Auswahl beenden" : "Mehrfachauswahl"}</span>
            <span className="sm:hidden">{selectionMode ? "Fertig" : "Auswahl"}</span>
          </Button>
          <Button onClick={handleAddClick} className="gap-1 flex-1 sm:flex-none px-2 sm:px-4 h-9 text-xs sm:text-sm">
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Neues Item</span>
            <span className="sm:hidden">Item</span>
          </Button>
          {!isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-9 text-xs sm:text-sm">
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}><FileText className="h-4 w-4 mr-2" /> Als CSV exportieren</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}><FileText className="h-4 w-4 mr-2" /> Als PDF exportieren</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSheets} disabled={isExporting}><Table2 className="h-4 w-4 mr-2" />{isExporting ? "Wird exportiert..." : "Nach Google Sheets"}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Drucken</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 text-xs sm:text-sm relative"
            onClick={() => setTrashOpen(true)}
            title="Papierkorb"
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Papierkorb</span>
            {trashedCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-muted-foreground/50" />
            )}
          </Button>
        </div>
      }
    />

      {/* Alle auswählen – nur sichtbar im selectionMode */}
      {selectionMode && items.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" size="sm" onClick={selectAll} className="h-8 text-xs">
            Alle auswählen ({items.length})
          </Button>
          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 text-xs">
              Auswahl aufheben
            </Button>
          )}
        </div>
      )}

      {/* FilterBar – searchRef für Autofokus */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setSearchParams({ ...Object.fromEntries(searchParams), search: value });
        }}
        categoryFilter={categoryFilter}
        onCategoryChange={(value) => {
          setCategoryFilter(value);
          setSearchParams({ ...Object.fromEntries(searchParams), category: value });
        }}
        conditionFilter={conditionFilter}
        onConditionChange={(value) => {
          setConditionFilter(value);
          setSearchParams({ ...Object.fromEntries(searchParams), filter: value });
        }}
        locationFilter={locationFilter}
        onLocationChange={(value) => {
          setLocationFilter(value);
          setSearchParams({ ...Object.fromEntries(searchParams), location: value });
        }}
        onClearFilters={() => {
          clearFilters();
          setSearchParams({});
        }}
        locations={locations}
        categories={categories}
        searchRef={searchRef}

        tagFilter={tagFilter}
        onTagChange={setTagFilter}
        availableTags={availableTags}
      />

      {/* ── Content ── */}
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
          eventSets={sets}
          onAddToSet={addItemToSet}
          onFilterCategory={(cat) => setCategoryFilter(cat)}
          onEnterSelectionMode={(firstId) => {
            setSelectionMode(true);
            toggleSelection(firstId);
          }}
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
          eventSets={sets}
          onAddToSet={addItemToSet}
          onFilterCategory={(cat) => setCategoryFilter(cat)}
        />
      )}

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
    </PullToRefreshWrapper>
  );
}