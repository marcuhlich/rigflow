import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { InventoryItem, ItemCategory, ItemCondition } from '@/types/inventory';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Json } from '@/integrations/supabase/types';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<ItemCondition | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Audit log helper
  const logAudit = async (
    action: string,
    itemId: string | null,
    itemName: string | null,
    changes?: Record<string, { old: unknown; new: unknown }>
  ) => {
    if (!user) return;
    try {
      await supabase.from('audit_log').insert([{
        user_id: user.id,
        item_id: itemId,
        action,
        item_name: itemName,
        changes: (changes || null) as Json,
      }]);
    } catch (error) {
      logger.error('useInventory', 'Audit log error', error);
    }
  };

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
      isMounted = false;
    };
  }, [user, toast]);

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
      await logAudit('create', data.id, item.name);
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
      const oldItem = items.find(i => i.id === id);
      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setItems(items.map(item => item.id === id ? data as InventoryItem : item));
      
      // Log changes
      if (oldItem) {
        const changes: Record<string, { old: unknown; new: unknown }> = {};
        Object.keys(updates).forEach(key => {
          const k = key as keyof typeof updates;
          if (oldItem[k] !== updates[k]) {
            changes[key] = { old: oldItem[k], new: updates[k] };
          }
        });
        if (Object.keys(changes).length > 0) {
          await logAudit('update', id, oldItem.name, changes);
        }
      }
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
      const item = items.find(i => i.id === id);
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setItems(items.filter(item => item.id !== id));
      if (item) {
        await logAudit('delete', id, item.name);
      }
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

  // Selection management
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map(i => i.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Batch operations
  const batchUpdateCondition = async (condition: ItemCondition) => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);

    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('inventory_items')
        .update({ condition })
        .in('id', ids);

      if (error) throw error;

      setItems(items.map(item => 
        selectedIds.has(item.id) ? { ...item, condition } : item
      ));

      const names = items.filter(i => selectedIds.has(i.id)).map(i => i.name).join(', ');
      await logAudit('batch_update', null, `${selectedIds.size} Items`, {
        condition: { old: 'diverse', new: condition },
        items: { old: null, new: names }
      });

      toast({
        title: "Batch-Update erfolgreich",
        description: `${selectedIds.size} Item(s) aktualisiert.`,
      });
      clearSelection();
    } catch (error) {
      logger.error('Batch update error:', error);
      toast({
        title: "Fehler",
        description: "Batch-Update fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const batchUpdateLocation = async (location: string) => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);

    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('inventory_items')
        .update({ location })
        .in('id', ids);

      if (error) throw error;

      setItems(items.map(item => 
        selectedIds.has(item.id) ? { ...item, location } : item
      ));

      const names = items.filter(i => selectedIds.has(i.id)).map(i => i.name).join(', ');
      await logAudit('batch_update', null, `${selectedIds.size} Items`, {
        location: { old: 'diverse', new: location },
        items: { old: null, new: names }
      });

      toast({
        title: "Batch-Update erfolgreich",
        description: `${selectedIds.size} Item(s) verschoben.`,
      });
      clearSelection();
    } catch (error) {
      logger.error('Batch update error:', error);
      toast({
        title: "Fehler",
        description: "Batch-Update fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);

    try {
      const ids = Array.from(selectedIds);
      const names = items.filter(i => selectedIds.has(i.id)).map(i => i.name).join(', ');
      
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setItems(items.filter(item => !selectedIds.has(item.id)));
      
      await logAudit('batch_delete', null, `${selectedIds.size} Items`, {
        items: { old: names, new: null }
      });

      toast({
        title: "Items gelöscht",
        description: `${selectedIds.size} Item(s) entfernt.`,
      });
      clearSelection();
    } catch (error) {
      logger.error('Batch delete error:', error);
      toast({
        title: "Fehler",
        description: "Batch-Löschen fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setConditionFilter('all');
    setLocationFilter('all');
  };

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
    // Selection
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    // Batch operations
    isProcessing,
    batchUpdateCondition,
    batchUpdateLocation,
    batchDelete,
  };
}
