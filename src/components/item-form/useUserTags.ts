import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

/** All tag names of the current user, used for autocomplete. Loaded while the form is open. */
export function useUserTags(enabled: boolean) {
  const { user } = useAuth();
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !enabled) return;
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('name')
        .eq('user_id', user.id)
        .order('name');
      if (cancelled) return;
      if (error) {
        // Suggestions are optional; the form keeps working without them.
        logger.error('ItemForm', 'Error loading tag suggestions', error);
        return;
      }
      setTags((data ?? []).map(row => row.name));
    };

    void load();
    return () => { cancelled = true; };
  }, [user, enabled]);

  return tags;
}
