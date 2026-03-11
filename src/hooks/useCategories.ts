import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface UserCategory {
  id: string;
  user_id: string;
  name: string;
  is_dmx_capable: boolean;
  sort_order: number;
  created_at: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('user_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setCategories((data as UserCategory[]) || []);
    } catch (e) {
      console.error('Error fetching categories:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const categoryNames = categories.map(c => c.name);
  const dmxCategories = categories.filter(c => c.is_dmx_capable).map(c => c.name);

  const addCategory = async (name: string, isDmxCapable = false) => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: 'Kategorie existiert bereits', variant: 'destructive' });
      return;
    }
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : -1;
    try {
      const { data, error } = await supabase
        .from('user_categories')
        .insert({ user_id: user.id, name: trimmed, is_dmx_capable: isDmxCapable, sort_order: maxOrder + 1 })
        .select()
        .single();
      if (error) throw error;
      setCategories(prev => [...prev, data as UserCategory]);
      toast({ title: 'Kategorie hinzugefügt', description: trimmed });
    } catch (e) {
      console.error('Error adding category:', e);
      toast({ title: 'Fehler', description: 'Kategorie konnte nicht hinzugefügt werden.', variant: 'destructive' });
    }
  };

  const removeCategory = async (name: string) => {
    if (!user) return;
    const cat = categories.find(c => c.name === name);
    if (!cat) return;
    try {
      const { error } = await supabase
        .from('user_categories')
        .delete()
        .eq('id', cat.id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      toast({ title: 'Kategorie entfernt', description: name });
    } catch (e) {
      console.error('Error removing category:', e);
      toast({ title: 'Fehler', description: 'Kategorie konnte nicht entfernt werden.', variant: 'destructive' });
    }
  };

  const toggleDmx = async (name: string) => {
    const cat = categories.find(c => c.name === name);
    if (!cat) return;
    try {
      const { error } = await supabase
        .from('user_categories')
        .update({ is_dmx_capable: !cat.is_dmx_capable })
        .eq('id', cat.id);
      if (error) throw error;
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_dmx_capable: !c.is_dmx_capable } : c));
    } catch (e) {
      console.error('Error toggling DMX:', e);
    }
  };

  return {
    categories,
    categoryNames,
    dmxCategories,
    loading,
    addCategory,
    removeCategory,
    toggleDmx,
    refetch: fetchCategories,
  };
}
