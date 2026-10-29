import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

export interface RecentItem {
  id: string;
  title: string;
  category: string;
  timestamp: number;
  path?: string;
}

const STORAGE_KEY = 'recent-items';
const MAX_ITEMS = 5;

export function useRecentItems() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  // Load auf Mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecentItems(parsed as RecentItem[]);
      } catch (error) {
        logger.warn('useRecentItems', 'Failed to parse recent items', error);
      }
    }
  }, []);

  // Neues Item hinzufügen
  const addItem = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    setRecentItems((prev) => {
      // Duplikate entfernen (wenn ID existiert)
      const filtered = prev.filter((i) => i.id !== item.id);
      // Neues Item an den Anfang
      const updated = [{ ...item, timestamp: Date.now() }, ...filtered].slice(
        0,
        MAX_ITEMS
      );
      // In LocalStorage speichern (Quota-/Privacy-Mode-Fehler nicht crashen lassen)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        logger.warn('useRecentItems', 'Could not persist recent items', error);
      }
      return updated;
    });
  }, []);

  // Alles löschen
  const clear = useCallback(() => {
    setRecentItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { recentItems, addItem, clear };
}
