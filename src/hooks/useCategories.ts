import type { SupabaseClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Category } from '@/types/inventory';
import { logger } from '@/lib/logger';

export type { Category };

export interface UserCategory {
  id: string;
  user_id: string;
  name: string;
  is_dmx_capable: boolean;
  sort_order: number;
  created_at: string;
}

export function useCategories() {
  const { user } = useAuth();
  const userId = user?.id;
  const [categories, setCategories] = useState<Category[]>([]);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([]);
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

        // Load user-specific categories if user is logged in
        if (userId) {
          if (isActive) {
            // user_categories fehlt in den generierten Typen (siehe Migration 20260311061809),
            // daher hier untypisiert abfragen.
            const { data: userCatData, error: userCatError } = await (supabase as unknown as SupabaseClient)
              .from('user_categories')
              .select('*')
              .eq('user_id', userId)
              .order('sort_order', { ascending: true });

            if (userCatError) logger.error('useCategories', 'Failed to load user categories', userCatError);
            if (isActive && !userCatError && userCatData) {
              setUserCategories(userCatData as UserCategory[]);
            }
          }
        } else {
          // User not logged in - clear user categories
          if (isActive) {
            setUserCategories([]);
          }
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

  return { categories, userCategories, categoryNames, dmxCategories, loading, getCategoryById };
}