import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CountRow {
  id: string;
  project_items: { count: number }[] | null;
}

/**
 * Number of item lines per project, via a PostgREST aggregate (one row per project,
 * so it isn't affected by the 1000-row response limit). Purely informational:
 * on failure the list simply shows no counts.
 */
export function useProjectItemCounts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["project-item-counts", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, project_items(count)")
        .is("deleted_at", null);
      if (error) throw error;
      const rows = (data ?? []) as unknown as CountRow[];
      return Object.fromEntries(rows.map(r => [r.id, r.project_items?.[0]?.count ?? 0]));
    },
  });
}
