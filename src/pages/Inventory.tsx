import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, QrCode, CheckSquare, Square, Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterBar } from "@/components/FilterBar";
import { InventoryGrid } from "@/components/InventoryGrid";
import { ItemForm } from "@/components/ItemForm";
import { EnhancedQRScanner } from "@/components/EnhancedQRScanner";
import { BatchActionsBar } from "@/components/BatchActionsBar";
import { AuditLogPanel } from "@/components/AuditLogPanel";
import { useInventory } from "@/hooks/useInventory";
import { InventoryItem } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { exportInventoryAsCSV, exportInventoryAsPDF, downloadCSV } from "@/lib/exportUtils";
import { printInventory } from "@/lib/printUtils";

export default function Inventory() {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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

  const {
    items,
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

  const handleAddClick = () => {
    setEditItem(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    try {
      await deleteItem(id);
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
      toast({
        title: "Item aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
    } else {
      await addItem(data);
      toast({
        title: "Item hinzugefügt",
        description: "Das neue Item wurde erfolgreich erstellt.",
      });
    }
  };

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
    </div>
  );
}
