import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Category } from '@/types/inventory';

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

        if (isActive && !catError && catData) {
          setCategories(catData as Category[]);
        }

        // Load user-specific categories if user is logged in
        if (user) {
          if (isActive) {
            const { data: userCatData, error: userCatError } = await supabase
              .from('user_categories')
              .select('*')
              .eq('user_id', user.id)
              .order('sort_order', { ascending: true });

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
        console.error('Error loading categories:', error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadCategories();

    return () => {
      isActive = false;
    };
  }, [user]);

  const categoryNames  = categories.map(c => c.name);
  const dmxCategories  = categories.filter(c => c.is_dmx_capable).map(c => c.id);
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  return { categories, userCategories, categoryNames, dmxCategories, loading, getCategoryById };
}