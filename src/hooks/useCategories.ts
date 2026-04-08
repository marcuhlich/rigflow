import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types/inventory';

export type { Category };

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setCategories(data as Category[]);
        setLoading(false);
      });
  }, []);

  const categoryNames  = categories.map(c => c.name);
  const dmxCategories  = categories.filter(c => c.is_dmx_capable).map(c => c.id);
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  return { categories, categoryNames, dmxCategories, loading, getCategoryById };
}