import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, QrCode, CheckSquare, Square, Download, FileText, Printer, Settings2, X, Zap, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FilterBar } from "@/components/FilterBar";
import { InventoryGrid } from "@/components/InventoryGrid";
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

export default function Inventory() {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDmx, setNewCategoryDmx] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { categoryNames, dmxCategories, addCategory, removeCategory, toggleDmx, categories } = useCategories();
  const history = useInventoryHistory();
  const undoRedoCtx = useUndoRedoContext();
  const handleExportCSV = () => {
    const csv = exportInventoryAsCSV(items);
    downloadCSV(csv, `inventar-${new Date().toISOString().split('T')[0]}.csv`);
    toast({ title: "Export erfolgreich", description: "CSV-Datei wurde heruntergeladen." });
  };

  const handleExportPDF = () => {
    exportInventoryAsPDF(items);
    toast({ title: "Export erfolgreich", description: "PDF-Datei wurde heruntergeladen." });
  };

  const handlePrint = () => {
    printInventory(items);
  };

  const { exportToSheets, isExporting } = useGoogleSheets();

  const {
    items,
    allItems,
    loading,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    conditionFilter,
    setConditionFilter,
    locationFilter,
    setLocationFilter,
    locations,
    clearFilters,
    addItem,
    updateItem,
    deleteItem,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isProcessing,
    batchUpdateCondition,
    batchUpdateLocation,
    batchDelete,
  } = useInventory();

  const handleExportSheets = async () => {
    try {
      await exportToSheets(items);
      toast({ title: "Export erfolgreich", description: "Google Sheet wurde geöffnet." });
    } catch {
      toast({ title: "Export fehlgeschlagen", description: "Bitte versuche es erneut.", variant: "destructive" });
    }
  };


  const handleAddClick = () => {
    setEditItem(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    const item = items.find(i => i.id === id) || allItems.find(i => i.id === id);
    try {
      await deleteItem(id);
      if (item) {
        history.pushAction({ type: 'delete', item });
      }
      toast({
        title: "Item gelöscht",
        description: "Das Item wurde erfolgreich entfernt.",
      });
    } catch {
      // Error handled in hook
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(`/inventory/${id}`);
  };

  const handleQRScan = (itemId: string) => {
    const scannedItem = items.find(i => i.id === itemId);
    if (scannedItem) {
      setIsScannerOpen(false);
      navigate(`/inventory/${itemId}`);
      toast({
        title: "Item gefunden",
        description: `${scannedItem.name} wurde gescannt.`,
      });
    } else {
      toast({
        title: "Item nicht gefunden",
        description: "Kein Item mit dieser ID vorhanden.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (data: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (editItem) {
      await updateItem(editItem.id, data);
      const newItem = { ...editItem, ...data, updated_at: new Date().toISOString() };
      history.pushAction({ type: 'update', oldItem: editItem, newItem });
      toast({
        title: "Item aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
    } else {
      await addItem(data);
      // For add, we need the item from the list after it's added
      // We'll find it by name+timestamp approximation - pushAction in next render
      // Use a simpler approach: track the latest added item
      const latestItem = allItems[0]; // After optimistic update, newest is first
      if (latestItem) {
        history.pushAction({ type: 'add', item: latestItem });
      }
      toast({
        title: "Item hinzugefügt",
        description: "Das neue Item wurde erfolgreich erstellt.",
      });
    }
  };

  // Undo/Redo handlers
  const handleUndo = useCallback(async () => {
    const action = history.undo();
    if (!action) return;

    try {
      switch (action.type) {
        case 'add':
          await deleteItem(action.item.id);
          toast({ title: "Rückgängig", description: `"${action.item.name}" wurde entfernt.` });
          break;
        case 'update': {
          const { id, user_id, created_at, updated_at, ...oldData } = action.oldItem;
          await updateItem(action.oldItem.id, oldData as any);
          toast({ title: "Rückgängig", description: `"${action.oldItem.name}" wurde zurückgesetzt.` });
          break;
        }
        case 'delete': {
          const { id, user_id, created_at, updated_at, ...itemData } = action.item;
          await addItem(itemData as any);
          toast({ title: "Rückgängig", description: `"${action.item.name}" wurde wiederhergestellt.` });
          break;
        }
      }
    } catch {
      // Re-push the action since undo failed
      history.pushAction(action);
    }
  }, [history, deleteItem, updateItem, addItem, toast]);

  const handleRedo = useCallback(async () => {
    const action = history.redo();
    if (!action) return;

    try {
      switch (action.type) {
        case 'add': {
          const { id, user_id, created_at, updated_at, ...itemData } = action.item;
          await addItem(itemData as any);
          toast({ title: "Wiederherstellen", description: `"${action.item.name}" wurde erneut hinzugefügt.` });
          break;
        }
        case 'update': {
          const { id, user_id, created_at, updated_at, ...newData } = action.newItem;
          await updateItem(action.newItem.id, newData as any);
          toast({ title: "Wiederherstellen", description: `"${action.newItem.name}" wurde erneut geändert.` });
          break;
        }
        case 'delete':
          await deleteItem(action.item.id);
          toast({ title: "Wiederherstellen", description: `"${action.item.name}" wurde erneut gelöscht.` });
          break;
      }
    } catch {
      // Failed redo
    }
  }, [history, deleteItem, updateItem, addItem, toast]);

  // Register undo/redo with global context
  useEffect(() => {
    undoRedoCtx.register({
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      onUndo: handleUndo,
      onRedo: handleRedo,
    });
  }, [history.canUndo, history.canRedo, handleUndo, handleRedo]);

  // Unregister on unmount
  useEffect(() => {
    return () => undoRedoCtx.unregister();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  const toggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection();
    }
    setSelectionMode(!selectionMode);
  };

  const [fakeLoading, setFakeLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setFakeLoading(false), 100); // 500ms Test
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
  return (
    <div className="space-y-4">
      {/* Buttons / Filter Bar Skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

  return (
    <div className="space-y-4 sm:space-y-6 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventar</h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {items.length} {items.length === 1 ? "Artikel" : "Artikel"} gefunden
          </p>
        </div>
        <div className="flex gap-1.5 sm:gap-2 w-full sm:w-auto flex-wrap">
          <Button 
            variant={selectionMode ? "default" : "outline"}
            onClick={toggleSelectionMode}
            className="gap-1 flex-1 sm:flex-none px-2 sm:px-4 h-9 text-xs sm:text-sm"
          >
            {selectionMode ? (
              <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            ) : (
              <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            )}
            <span className="hidden sm:inline">{selectionMode ? "Auswahl beenden" : "Mehrfachauswahl"}</span>
            <span className="sm:hidden">{selectionMode ? "Fertig" : "Auswahl"}</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsScannerOpen(true)}
            className="gap-1 flex-1 sm:flex-none px-2 sm:px-4 h-9 text-xs sm:text-sm"
          >
            <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">QR scannen</span>
            <span className="sm:hidden">Scan</span>
          </Button>
          <Button 
            onClick={handleAddClick} 
            className="gap-1 flex-1 sm:flex-none px-2 sm:px-4 h-9 text-xs sm:text-sm"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Neues Item</span>
            <span className="sm:hidden">Item</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setCategoryManagerOpen(true)}
            className="gap-1 flex-1 sm:flex-none px-2 sm:px-4 h-9 text-xs sm:text-sm"
          >
            <Settings2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Kategorien</span>
            <span className="sm:hidden">Kat.</span>
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
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  Als CSV exportieren
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Als PDF exportieren
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSheets} disabled={isExporting}>
                  <Table2 className="h-4 w-4 mr-2" />
                  {isExporting ? "Wird exportiert..." : "Nach Google Sheets exportieren"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Drucken
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

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

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        conditionFilter={conditionFilter}
        onConditionChange={setConditionFilter}
        locationFilter={locationFilter}
        onLocationChange={setLocationFilter}
        locations={locations}
        categories={categoryNames}
        onClearFilters={clearFilters}
      />

      <InventoryGrid
        items={items}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onViewDetails={handleViewDetails}
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
        selectionMode={selectionMode}
      />

      <AuditLogPanel />

      <ItemForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        editItem={editItem}
        categories={categoryNames}
        dmxCategories={dmxCategories}
      />

      <EnhancedQRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onItemFound={handleQRScan}
        onNavigateToItem={handleViewDetails}
      />

      <BatchActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={() => {
          clearSelection();
          setSelectionMode(false);
        }}
        onBatchUpdateCondition={batchUpdateCondition}
        onBatchUpdateLocation={batchUpdateLocation}
        onBatchDelete={batchDelete}
        locations={locations}
        isProcessing={isProcessing}
      />

      {/* Category Manager Dialog */}
      <Dialog open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kategorien verwalten</DialogTitle>
            <DialogDescription>Füge neue Kategorien hinzu oder entferne bestehende.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Neue Kategorie..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    addCategory(newCategoryName, newCategoryDmx);
                    setNewCategoryName('');
                    setNewCategoryDmx(false);
                  }
                }}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (newCategoryName.trim()) {
                    addCategory(newCategoryName, newCategoryDmx);
                    setNewCategoryName('');
                    setNewCategoryDmx(false);
                  }
                }}
                disabled={!newCategoryName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="dmx-capable"
                checked={newCategoryDmx}
                onCheckedChange={setNewCategoryDmx}
              />
              <Label htmlFor="dmx-capable" className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> DMX-fähig
              </Label>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{cat.name}</span>
                    {cat.is_dmx_capable && (
                      <Badge variant="secondary" className="text-xs gap-0.5 cursor-pointer" onClick={() => toggleDmx(cat.name)}>
                        <Zap className="h-2.5 w-2.5" /> DMX
                      </Badge>
                    )}
                    {!cat.is_dmx_capable && (
                      <button
                        onClick={() => toggleDmx(cat.name)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        + DMX
                      </button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeCategory(cat.name)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Keine Kategorien vorhanden.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
