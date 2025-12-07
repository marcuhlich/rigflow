/**
 * Hook für Event Checklist Verwaltung
 */
import { useState, useCallback } from 'react';
import { EventChecklist, ChecklistItem, DEFAULT_TEMPLATES, calculateChecklistStats } from '@/types/checklist';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

const STORAGE_KEY = 'event-checklists';

export function useEventChecklists() {
  const [checklists, setChecklists] = useState<EventChecklist[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Error loading checklists from localStorage:', error);
      return [];
    }
  });

  const { toast } = useToast();

  // Speichere Checklists in localStorage
  const saveToLocalStorage = useCallback((updatedChecklists: EventChecklist[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChecklists));
    } catch (error) {
      logger.error('Error saving checklists to localStorage:', error);
      toast({
        title: 'Fehler',
        description: 'Checklists konnten nicht gespeichert werden',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Erstelle neue Checklist
  const createChecklist = useCallback((
    eventName: string,
    type: 'pre-event' | 'post-event' | 'general',
    templateId?: string
  ) => {
    try {
      const template = templateId 
        ? Object.values(DEFAULT_TEMPLATES).find(t => t.id === templateId)
        : DEFAULT_TEMPLATES[type];

      if (!template) {
        throw new Error('Template nicht gefunden');
      }

      const newChecklist: EventChecklist = {
        id: `checklist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventName,
        type,
        items: template.items.map((item, idx) => ({
          id: `item-${idx}`,
          text: item.text,
          status: 'pending' as const,
          order: item.order,
        })),
        description: template.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user_id: 'current-user', // TODO: Nutzer-ID von Auth
      };

      const updated = [newChecklist, ...checklists];
      setChecklists(updated);
      saveToLocalStorage(updated);

      toast({
        title: 'Checklist erstellt',
        description: `"${eventName}" wurde hinzugefügt`,
      });

      return newChecklist;
    } catch (error) {
      logger.error('Error creating checklist:', error);
      toast({
        title: 'Fehler',
        description: 'Checklist konnte nicht erstellt werden',
        variant: 'destructive',
      });
      return null;
    }
  }, [checklists, saveToLocalStorage, toast]);

  // Aktualisiere Checklist Item Status
  const updateItemStatus = useCallback((
    checklistId: string,
    itemId: string,
    status: 'pending' | 'completed' | 'skipped'
  ) => {
    try {
      const updated = checklists.map(checklist => {
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
      });

      setChecklists(updated);
      saveToLocalStorage(updated);
      return true;
    } catch (error) {
      logger.error('Error updating item status:', error);
      toast({
        title: 'Fehler',
        description: 'Item konnte nicht aktualisiert werden',
        variant: 'destructive',
      });
      return false;
    }
  }, [checklists, saveToLocalStorage, toast]);

  // Füge Item zu Checklist hinzu
  const addItem = useCallback((
    checklistId: string,
    text: string,
    notes?: string
  ) => {
    try {
      const updated = checklists.map(checklist => {
        if (checklist.id === checklistId) {
          const maxOrder = Math.max(...checklist.items.map(i => i.order), 0);
          return {
            ...checklist,
            items: [
              ...checklist.items,
              {
                id: `item-${Date.now()}`,
                text,
                status: 'pending' as const,
                order: maxOrder + 1,
                notes,
              },
            ],
            updatedAt: new Date().toISOString(),
          };
        }
        return checklist;
      });

      setChecklists(updated);
      saveToLocalStorage(updated);

      toast({
        title: 'Item hinzugefügt',
        description: `"${text.substring(0, 30)}..." wurde zur Checklist hinzugefügt`,
      });

      return true;
    } catch (error) {
      logger.error('Error adding item:', error);
      toast({
        title: 'Fehler',
        description: 'Item konnte nicht hinzugefügt werden',
        variant: 'destructive',
      });
      return false;
    }
  }, [checklists, saveToLocalStorage, toast]);

  // Lösche Item
  const deleteItem = useCallback((
    checklistId: string,
    itemId: string
  ) => {
    try {
      const updated = checklists.map(checklist => {
        if (checklist.id === checklistId) {
          return {
            ...checklist,
            items: checklist.items.filter(i => i.id !== itemId),
            updatedAt: new Date().toISOString(),
          };
        }
        return checklist;
      });

      setChecklists(updated);
      saveToLocalStorage(updated);
      return true;
    } catch (error) {
      logger.error('Error deleting item:', error);
      return false;
    }
  }, [checklists, saveToLocalStorage, toast]);

  // Lösche ganze Checklist
  const deleteChecklist = useCallback((checklistId: string) => {
    try {
      const updated = checklists.filter(c => c.id !== checklistId);
      setChecklists(updated);
      saveToLocalStorage(updated);

      toast({
        title: 'Checklist gelöscht',
        description: 'Die Checklist wurde entfernt',
      });

      return true;
    } catch (error) {
      logger.error('Error deleting checklist:', error);
      return false;
    }
  }, [checklists, saveToLocalStorage, toast]);

  // Erhalte Checklist Stats
  const getChecklistStats = useCallback((checklistId: string) => {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return null;
    return calculateChecklistStats(checklist.items);
  }, [checklists]);

  return {
    checklists,
    createChecklist,
    updateItemStatus,
    addItem,
    deleteItem,
    deleteChecklist,
    getChecklistStats,
  };
}
