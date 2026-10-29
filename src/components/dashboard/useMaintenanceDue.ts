import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { InventoryItem } from "@/types/inventory";

/** `maintenance_interval_days` exists in the DB row (select *) but not on the shared type. */
type ItemWithInterval = InventoryItem & { maintenance_interval_days?: number | null };

/** Items whose next maintenance is due within this many days are listed. */
const LOOKAHEAD_DAYS = 14;

export interface MaintenanceDue {
  item: InventoryItem;
  /** Next due date, or null if the item was never maintained. */
  dueDate: Date | null;
  /** Days until due (negative = overdue). null if never maintained. */
  daysLeft: number | null;
}

/**
 * Upcoming / overdue maintenance for items that have an explicit
 * maintenance interval. Items without an interval are ignored so the
 * dashboard isn't flooded with "never maintained" entries.
 */
export function useMaintenanceDue(items: InventoryItem[]) {
  const { user } = useAuth();

  const tracked = useMemo(
    () =>
      (items as ItemWithInterval[]).filter(
        (i) => typeof i.maintenance_interval_days === "number" && i.maintenance_interval_days > 0
      ),
    [items]
  );

  const query = useQuery({
    queryKey: ["dashboard", "maintenance-latest", user?.id],
    enabled: !!user && tracked.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_records")
        .select("item_id, performed_at")
        .eq("user_id", user!.id)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      const latest: Record<string, string> = {};
      for (const row of data ?? []) {
        if (!latest[row.item_id]) latest[row.item_id] = row.performed_at;
      }
      return latest;
    },
  });

  const due = useMemo<MaintenanceDue[]>(() => {
    if (!query.data) return [];
    const today = startOfDay(new Date());
    const result: MaintenanceDue[] = [];
    for (const item of tracked) {
      const last = query.data[item.id];
      if (!last) {
        result.push({ item, dueDate: null, daysLeft: null });
        continue;
      }
      const dueDate = addDays(parseISO(last), item.maintenance_interval_days!);
      const daysLeft = differenceInCalendarDays(dueDate, today);
      if (daysLeft <= LOOKAHEAD_DAYS) result.push({ item, dueDate, daysLeft });
    }
    // Never maintained first, then most overdue first
    return result.sort((a, b) => (a.daysLeft ?? -Infinity) - (b.daysLeft ?? -Infinity));
  }, [query.data, tracked]);

  return {
    due,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
