import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/FilterBar";
import { InventoryGrid } from "@/components/InventoryGrid";
import { ItemForm } from "@/components/ItemForm";
import { useInventory } from "@/hooks/useInventory";
import { InventoryItem } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";

export default function Inventory() {
  const [isFormOpen, setIsFormOpen] = useState(false);
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventar</h2>
          <p className="text-muted-foreground mt-1">
            {items.length} {items.length === 1 ? "Artikel" : "Artikel"} gefunden
          </p>
        </div>
        <Button onClick={handleAddClick} className="gap-2">
          <Plus className="h-4 w-4" />
          Neues Item
        </Button>
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
      />

      <ItemForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        editItem={editItem}
      />
    </div>
  );
}
