import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Category } from '@/types/inventory';
import { logger } from '@/lib/logger';

export type { Category };

export function useCategories() {
  const { user } = useAuth();
  const userId = user?.id;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadCategories = async () => {
      try {
        // Load global categories first
        const { data: catData, error: catError } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true });

        if (catError) logger.error('useCategories', 'Failed to load categories', catError);
        if (isActive && !catError && catData) {
          setCategories(catData as Category[]);
        }

      } catch (error) {
        logger.error('useCategories', 'Error loading categories', error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadCategories();

    return () => {
      isActive = false;
    };
  }, [userId]); // only refetch when the account changes, not on token refresh

  const categoryNames  = categories.map(c => c.name);
  const dmxCategories  = categories.filter(c => c.is_dmx_capable).map(c => c.id);
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  return { categories, categoryNames, dmxCategories, loading, getCategoryById };
}