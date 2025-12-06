import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/FilterBar";
import { InventoryGrid } from "@/components/InventoryGrid";
import { ItemForm } from "@/components/ItemForm";
import { QRScanner } from "@/components/QRScanner";
import { useInventory } from "@/hooks/useInventory";
import { InventoryItem } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const { toast } = useToast();

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
    // Find item and navigate to details
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventar</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {items.length} {items.length === 1 ? "Artikel" : "Artikel"} gefunden
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsScannerOpen(true)}
            className="gap-2"
          >
            <QrCode className="h-4 w-4" />
            QR-Code scannen
          </Button>
          <Button onClick={handleAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Neues Item
          </Button>
        </div>
      </div>

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
      />

      <ItemForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        editItem={editItem}
      />

      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleQRScan}
      />
    </div>
  );
}
