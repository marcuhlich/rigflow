import { useState } from "react";
import { Plus, Package, CheckCircle, ArrowRightLeft, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { FilterBar } from "@/components/FilterBar";
import { InventoryTable } from "@/components/InventoryTable";
import { ItemForm } from "@/components/ItemForm";
import { useInventory } from "@/hooks/useInventory";
import { InventoryItem } from "@/types/inventory";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const { toast } = useToast();

  const {
    items,
    stats,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    conditionFilter,
    setConditionFilter,
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

  const handleDeleteClick = (id: string) => {
    deleteItem(id);
    toast({
      title: "Item gelöscht",
      description: "Das Item wurde erfolgreich entfernt.",
    });
  };

  const handleFormSubmit = (data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editItem) {
      updateItem(editItem.id, data);
      toast({
        title: "Item aktualisiert",
        description: "Die Änderungen wurden gespeichert.",
      });
    } else {
      addItem(data);
      toast({
        title: "Item hinzugefügt",
        description: "Das neue Item wurde erfolgreich erstellt.",
      });
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 pulse-glow">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                EventTech <span className="gradient-text">Inventory</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Veranstaltungstechnik einfach verwalten
              </p>
            </div>
          </div>
          <Button onClick={handleAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Neues Item
          </Button>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Gesamt"
            value={stats.total}
            icon={Package}
            variant="default"
            delay={0}
          />
          <StatCard
            title="Verfügbar"
            value={stats.available}
            icon={CheckCircle}
            variant="success"
            delay={50}
          />
          <StatCard
            title="Verliehen"
            value={stats.lent}
            icon={ArrowRightLeft}
            variant="warning"
            delay={100}
          />
          <StatCard
            title="Im Einsatz"
            value={stats.inUse}
            icon={Zap}
            variant="primary"
            delay={150}
          />
          <StatCard
            title="Defekt"
            value={stats.defect}
            icon={AlertTriangle}
            variant="destructive"
            delay={200}
          />
        </section>

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          conditionFilter={conditionFilter}
          onConditionChange={setConditionFilter}
          onClearFilters={clearFilters}
        />

        {/* Inventory Table */}
        <InventoryTable
          items={items}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />

        {/* Item Form Modal */}
        <ItemForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          editItem={editItem}
        />
      </div>
    </div>
  );
};

export default Index;
