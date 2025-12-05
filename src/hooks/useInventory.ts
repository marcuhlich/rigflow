import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { InventoryItem, ItemCategory, ItemCondition } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<ItemCondition | 'all'>('all');
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch items from database
  const fetchItems = async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItems(data as InventoryItem[]);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Fehler",
        description: "Items konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
      
      return matchesSearch && matchesCategory && matchesCondition;
    });
  }, [items, searchQuery, categoryFilter, conditionFilter]);

  const stats = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    const available = items.filter(i => i.condition === 'verfügbar').reduce((sum, item) => sum + item.quantity, 0);
    const lent = items.filter(i => i.condition === 'verliehen').reduce((sum, item) => sum + item.quantity, 0);
    const inUse = items.filter(i => i.condition === 'in-einsatz').reduce((sum, item) => sum + item.quantity, 0);
    const defect = items.filter(i => i.condition === 'defekt').reduce((sum, item) => sum + item.quantity, 0);
    
    return { total, available, lent, inUse, defect };
  }, [items]);

  const addItem = async (item: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          ...item,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setItems([data as InventoryItem, ...items]);
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Fehler",
        description: "Item konnte nicht hinzugefügt werden.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateItem = async (id: string, updates: Omit<InventoryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setItems(items.map(item => item.id === id ? data as InventoryItem : item));
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "Fehler",
        description: "Item konnte nicht aktualisiert werden.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems(items.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Fehler",
        description: "Item konnte nicht gelöscht werden.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setConditionFilter('all');
  };

  return {
    items: filteredItems,
    allItems: items,
    stats,
    loading,
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
    refetch: fetchItems,
  };
}
