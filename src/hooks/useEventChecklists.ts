/**
 * Hook für Event Checklist Verwaltung mit Supabase Backend und Realtime-Sync
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { EventChecklist, ChecklistItem, DEFAULT_TEMPLATES, calculateChecklistStats } from '@/types/checklist';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface DbChecklist {
  id: string;
  user_id: string;
  event_name: string;
  type: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface DbChecklistItem {
  id: string;
  checklist_id: string;
  text: string;
  status: string;
  notes: string | null;
  item_order: number;
  created_at: string;
  updated_at: string;
}

export function useEventChecklists() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<EventChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Lade Checklists von Supabase
  const fetchChecklists = useCallback(async () => {
    if (!user) {
      setChecklists([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch checklists
      const { data: checklistsData, error: checklistsError } = await supabase
        .from('checklists')
        .select('*')
        .order('created_at', { ascending: false });

      if (checklistsError) throw checklistsError;

      if (!checklistsData || checklistsData.length === 0) {
        setChecklists([]);
        setLoading(false);
        return;
      }

      // Fetch all items for these checklists
      const checklistIds = checklistsData.map(c => c.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .in('checklist_id', checklistIds)
        .order('item_order', { ascending: true });

      if (itemsError) throw itemsError;

      // Map to EventChecklist format
      const mappedChecklists: EventChecklist[] = checklistsData.map((checklist: DbChecklist) => ({
        id: checklist.id,
        eventName: checklist.event_name,
        type: checklist.type as 'pre-event' | 'post-event' | 'general',
        description: checklist.description || undefined,
        createdAt: checklist.created_at,
        updatedAt: checklist.updated_at,
        user_id: checklist.user_id,
        items: (itemsData || [])
          .filter((item: DbChecklistItem) => item.checklist_id === checklist.id)
          .map((item: DbChecklistItem) => ({
            id: item.id,
            text: item.text,
            status: item.status as 'pending' | 'completed' | 'skipped',
            order: item.item_order,
            notes: item.notes || undefined,
          })),
      }));

      setChecklists(mappedChecklists);
    } catch (error) {
      logger.error('useEventChecklists', 'Error loading checklists', error, {});
      toast({
        title: 'Fehler',
        description: 'Checklists konnten nicht geladen werden',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Realtime subscription setup
  useEffect(() => {
    if (!user) return;

    // Create realtime channel for both tables
    const channel = supabase
      .channel('checklists-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklists',
        },
        (payload) => {
          logger.info('useEventChecklists', 'Realtime checklist change', { event: payload.eventType });
          // Refetch on any checklist change
          fetchChecklists();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklist_items',
        },
        (payload) => {
          logger.info('useEventChecklists', 'Realtime item change', { event: payload.eventType });
          // Refetch on any item change
          fetchChecklists();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchChecklists]);

  // Initial fetch
  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  // Erstelle neue Checklist
  const createChecklist = useCallback(async (
    eventName: string,
    type: 'pre-event' | 'post-event' | 'general',
    templateId?: string
  ) => {
    if (!user) {
      toast({
        title: 'Fehler',
        description: 'Bitte melden Sie sich an',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const template = templateId 
        ? Object.values(DEFAULT_TEMPLATES).find(t => t.id === templateId)
        : DEFAULT_TEMPLATES[type];

      if (!template) {
        throw new Error('Template nicht gefunden');
      }

      // Create checklist
      const { data: newChecklist, error: checklistError } = await supabase
        .from('checklists')
        .insert({
          user_id: user.id,
          event_name: eventName,
          type,
          description: template.description || null,
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Create items if template has items
      if (template.items && template.items.length > 0) {
        const itemsToInsert = template.items.map((item, idx) => ({
          checklist_id: newChecklist.id,
          text: item.text,
          status: 'pending',
          item_order: item.order || idx + 1,
        }));

        const { error: itemsError } = await supabase
          .from('checklist_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast({
        title: 'Checklist erstellt',
        description: `"${eventName}" wurde hinzugefügt`,
      });

      // Refresh data
      await fetchChecklists();

      return newChecklist;
    } catch (error) {
      logger.error('useEventChecklists', 'Error creating checklist', error, {});
      toast({
        title: 'Fehler',
        description: 'Checklist konnte nicht erstellt werden',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, fetchChecklists, toast]);

  // Aktualisiere Checklist Item Status
  const updateItemStatus = useCallback(async (
    checklistId: string,
    itemId: string,
    status: 'pending' | 'completed' | 'skipped'
  ) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({ status })
        .eq('id', itemId);

      if (error) throw error;

      // Update local state immediately for responsiveness
      setChecklists(prev => prev.map(checklist => {
        if (checklist.id === checklistId) {
          return {
            ...checklist,
            items: checklist.items.map(item =>
              item.id === itemId ? { ...item, status } : item
            ),
            updatedAt: new Date().toISOString(),
          };
        }
        return checklist;
      }));

      return true;
    } catch (error) {
      logger.error('useEventChecklists', 'Error updating item status', error, {});
      toast({
        title: 'Fehler',
        description: 'Item konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // Füge Item zu Checklist hinzu
  const addItem = useCallback(async (
    checklistId: string,
    text: string,
    notes?: string
  ) => {
    try {
      // Get max order
      const checklist = checklists.find(c => c.id === checklistId);
      const maxOrder = checklist 
        ? Math.max(...checklist.items.map(i => i.order), 0) 
        : 0;

      const { data: newItem, error } = await supabase
        .from('checklist_items')
        .insert({
          checklist_id: checklistId,
          text,
          status: 'pending',
          item_order: maxOrder + 1,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setChecklists(prev => prev.map(cl => {
        if (cl.id === checklistId) {
          return {
            ...cl,
            items: [
              ...cl.items,
              {
                id: newItem.id,
                text: newItem.text,
                status: newItem.status as 'pending' | 'completed' | 'skipped',
                order: newItem.item_order,
                notes: newItem.notes || undefined,
              },
            ],
            updatedAt: new Date().toISOString(),
          };
        }
        return cl;
      }));

      toast({
        title: 'Item hinzugefügt',
        description: `"${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" wurde hinzugefügt`,
      });

      return true;
    } catch (error) {
      logger.error('useEventChecklists', 'Error adding item', error, {});
      toast({
        title: 'Fehler',
        description: 'Item konnte nicht hinzugefügt werden',
        variant: 'destructive',
      });
      return false;
    }
  }, [checklists, toast]);

  // Lösche Item
  const deleteItem = useCallback(async (
    checklistId: string,
    itemId: string
  ) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setChecklists(prev => prev.map(checklist => {
        if (checklist.id === checklistId) {
          return {
            ...checklist,
            items: checklist.items.filter(i => i.id !== itemId),
            updatedAt: new Date().toISOString(),
          };
        }
        return checklist;
      }));

      return true;
    } catch (error) {
      logger.error('useEventChecklists', 'Error deleting item', error, {});
      return false;
    }
  }, []);

  // Lösche ganze Checklist
  const deleteChecklist = useCallback(async (checklistId: string) => {
    try {
      const { error } = await supabase
        .from('checklists')
        .delete()
        .eq('id', checklistId);

      if (error) throw error;

      // Update local state
      setChecklists(prev => prev.filter(c => c.id !== checklistId));

      toast({
        title: 'Checklist gelöscht',
        description: 'Die Checklist wurde entfernt',
      });

      return true;
    } catch (error) {
      logger.error('useEventChecklists', 'Error deleting checklist', error, {});
      return false;
    }
  }, [toast]);

  // Erhalte Checklist Stats
  const getChecklistStats = useCallback((checklistId: string) => {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return null;
    return calculateChecklistStats(checklist.items);
  }, [checklists]);

  return {
    checklists,
    loading,
    createChecklist,
    updateItemStatus,
    addItem,
    deleteItem,
    deleteChecklist,
    getChecklistStats,
    refetch: fetchChecklists,
  };
}
