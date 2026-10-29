import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Project, ProjectStatus } from '@/types/project';
import { offlineQueue } from '@/lib/offlineQueue';
import i18n from '@/i18n';

/** Legacy (not user-scoped) cache key – only read as a migration fallback. */
const PROJECTS_CACHE_KEY = 'projects';
const projectsCacheKey = (userId: string) => `${PROJECTS_CACHE_KEY}_${userId}`;

type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

function readProjectsCache(userId: string): Project[] | null {
  const own = offlineQueue.getCache<Project[]>(projectsCacheKey(userId));
  if (own) return own;
  const legacy = offlineQueue.getCache<Project[]>(PROJECTS_CACHE_KEY);
  if (legacy && legacy.every(p => p.user_id === userId)) return legacy;
  return null;
}

export const STATUS_ORDER: ProjectStatus[] = [
  'draft', 'planned', 'packed', 'transit', 'live', 'returning', 'archived',
];

export function isWarningJump(from: ProjectStatus, to: ProjectStatus): boolean {
  const fi = STATUS_ORDER.indexOf(from);
  const ti = STATUS_ORDER.indexOf(to);
  if (fi === -1 || ti === -1) return false;
  return ti < fi && fi >= 3;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<Error | null>(null);
  const { user }  = useAuth();
  const { toast } = useToast();

  const userId = user?.id;

  // Guards against out-of-order responses and state updates after unmount
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchProjects = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => mountedRef.current && requestId === requestIdRef.current;

    if (!userId) { if (isCurrent()) { setProjects([]); setLoading(false); } return; }

    // Cache sofort zeigen
    const cached = readProjectsCache(userId);
    if (cached && cached.length > 0 && isCurrent()) {
      setProjects(cached);
      setLoading(false);
    }

    // Offline → Cache nutzen, kein Toast
    if (!navigator.onLine) {
      if (isCurrent()) { if (!cached) setProjects([]); setLoading(false); }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .is('deleted_at', null)
        .order('is_favorite', { ascending: false })
        .order('created_at',  { ascending: false });
      if (error) throw error;
      const typed = (data ?? []) as Project[];
      offlineQueue.setCache(projectsCacheKey(userId), typed);
      if (isCurrent()) { setProjects(typed); setError(null); }
    } catch (err) {
      if (isCurrent()) setError(err instanceof Error ? err : new Error(String(err)));
      logger.error('useProjects', 'Failed to load projects', err);
      const isNetworkError = err instanceof Error && err.message.includes('Failed to fetch');
      if (!isNetworkError && isCurrent()) {
        toast({
          title: i18n.t('common.error'),
          description: i18n.t('feedback.projects_load_failed'),
          variant: 'destructive',
        });
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [userId, toast]);

  const fail = (action: string, error: unknown): never => {
    logger.error('useProjects', action, error);
    toast({ title: i18n.t('common.error'), variant: 'destructive' });
    throw error;
  };

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
      .insert({ ...data, name: data.name, user_id: user.id, status: 'draft' })
      .select()
      .single();
    if (error) fail('Create project failed', error);
    await fetchProjects();
    return project as Project;
  };

  const updateProject = async (
    id: string,
    updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>>,
  ) => {
    const { error } = await supabase.from('projects').update(updates as ProjectUpdate).eq('id', id);
    if (error) fail('Update project failed', error);
    await fetchProjects();
  };

  const updateStatus = async (id: string, status: ProjectStatus) => {
    const { error } = await supabase.from('projects').update({ status }).eq('id', id);
    if (error) fail('Update project status failed', error);
    await fetchProjects();
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) fail('Delete project failed', error);
    await fetchProjects();
  };

  // Latest list, updated synchronously on optimistic changes (rapid toggles must not read a stale copy)
  const projectsRef = useRef(projects);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  const setFavoriteLocally = (id: string, isFavorite: boolean) => {
    projectsRef.current = projectsRef.current.map(x => x.id === id ? { ...x, is_favorite: isFavorite } : x);
    setProjects(projectsRef.current);
  };

  const toggleFavorite = async (id: string) => {
    const p = projectsRef.current.find(x => x.id === id);
    if (!p) return;
    const next = !p.is_favorite;
    setFavoriteLocally(id, next);
    try {
      await updateProject(id, { is_favorite: next });
    } catch (err) {
      setFavoriteLocally(id, p.is_favorite);
      throw err;
    }
  };

  return {
    projects, loading, error,
    createProject, updateProject, updateStatus, deleteProject, toggleFavorite,
    refetch: fetchProjects,
  };
}