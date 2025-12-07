import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { InventoryItem, ItemCategory, ItemCondition } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<ItemCondition | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch items from database
  useEffect(() => {
    let isMounted = true;

    const fetchItemsSafely = async () => {
      if (!user) {
        if (isMounted) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // ✅ Prüfe ob Component noch gemountet ist
        if (isMounted) {
          setItems(data as InventoryItem[]);
        }
      } catch (error) {
        if (isMounted) {
          logger.error('Error fetching items:', error);
          
          const errorMessage = error instanceof Error 
            ? error.message 
            : 'Items konnten nicht geladen werden. Prüfe deine Internetverbindung.';
          
          toast({
            title: "Fehler beim Laden",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchItemsSafely();

    return () => {
      isMounted = false; // ✅ Cleanup: Verhindere State Updates nach Unmount
    };
  }, [user, toast]); // ✅ Alle Dependencies hinzugefügt

  // Extract unique locations
  const locations = useMemo(() => {
    const uniqueLocations = [...new Set(items.map(item => item.location))];
    return uniqueLocations.sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
      const matchesLocation = locationFilter === 'all' || item.location === locationFilter;
      
      return matchesSearch && matchesCategory && matchesCondition && matchesLocation;
    });
  }, [items, searchQuery, categoryFilter, conditionFilter, locationFilter]);

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
      logger.error('Error adding item:', error);
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
      logger.error('Error updating item:', error);
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
      logger.error('Error deleting item:', error);
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
    setLocationFilter('all');
  };

  // ✅ Refetch-Funktion - triggert manuelles Neuladen
  const refetch = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data as InventoryItem[]);
    } catch (error) {
      logger.error('Error refetching items:', error);
      toast({
        title: "Fehler beim Neuladen",
        description: "Items konnten nicht neu geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
    locationFilter,
    setLocationFilter,
    locations,
    clearFilters,
    addItem,
    updateItem,
    deleteItem,
    refetch,
  };
}
