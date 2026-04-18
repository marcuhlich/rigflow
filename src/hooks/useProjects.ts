import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Project, ProjectStatus } from '@/types/project';

export const STATUS_ORDER: ProjectStatus[] = [
  'draft', 'planned', 'packed', 'transit', 'live', 'returning',
];

/** Warnung nötig wenn rückwärts von transit oder später */
export function isWarningJump(from: ProjectStatus, to: ProjectStatus): boolean {
  const fi = STATUS_ORDER.indexOf(from);
  const ti = STATUS_ORDER.indexOf(to);
  // archived kann kein Warning-Jump auslösen
  if (fi === -1 || ti === -1) return false;
  return ti < fi && fi >= 3;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const { user }  = useAuth();
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    if (!user) { setProjects([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .is('deleted_at', null)
        .order('is_favorite', { ascending: false })
        .order('created_at',  { ascending: false });
      if (error) throw error;
      setProjects((data ?? []) as unknown as Project[]);
    } catch {
      toast({ title: 'Fehler', description: 'Projekte konnten nicht geladen werden.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const createProject = async (data: {
    name: string;
    description?: string | null;
    event_date_start?: string | null;
    event_date_end?: string | null;
    location?: string | null;
    notes?: string | null;
  }) => {
    if (!user) return;
    const { data: project, error } = await supabase
      .from('projects')
      .insert({ ...data, user_id: user.id, status: 'draft' } as any)
      .select()
      .single();
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchProjects();
    return project as unknown as Project;
  };

  const updateProject = async (
    id: string,
    updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>>,
  ) => {
    const { error } = await supabase.from('projects').update(updates as any).eq('id', id);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchProjects();
  };

  const updateStatus = async (id: string, status: ProjectStatus) => {
    const { error } = await supabase.from('projects').update({ status } as any).eq('id', id);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchProjects();
  };

  /** Soft-Delete */
  const deleteProject = async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (error) { toast({ title: 'Fehler', variant: 'destructive' }); throw error; }
    await fetchProjects();
  };

  const toggleFavorite = async (id: string) => {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    await updateProject(id, { is_favorite: !p.is_favorite });
  };

  return {
    projects, loading,
    createProject, updateProject, updateStatus, deleteProject, toggleFavorite,
    refetch: fetchProjects,
  };
}