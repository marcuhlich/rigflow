// src/hooks/useMaintenanceStatus.ts
// Holt nur den letzten Wartungseintrag (LIMIT 1) um den Tab-Dot zu befüllen.
// Läuft sofort beim Mount – unabhängig davon, welcher Tab aktiv ist.
import { useState, useEffect } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const GLOBAL_DEFAULT_INTERVAL = 180;

interface MaintenanceStatus {
  overdue: boolean;
  warning: boolean;
  loading: boolean;
}

export function useMaintenanceStatus(
  itemId: string,
  intervalDays?: number | null,
): MaintenanceStatus {
  const [status, setStatus] = useState<MaintenanceStatus>({
    overdue: false,
    warning: false,
    loading: true,
  });

  useEffect(() => {
    if (!itemId) return;
    let cancelled = false;

    async function check() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('maintenance_records')
        .select('performed_at')
        .eq('item_id', itemId)
        .order('performed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      const interval = intervalDays ?? GLOBAL_DEFAULT_INTERVAL;
      const days     = data ? differenceInDays(new Date(), parseISO(data.performed_at)) : null;
      const overdue  = days === null || days > interval;
      const warning  = !overdue && days !== null && days > interval * 0.75;

      setStatus({ overdue, warning, loading: false });
    }

    check();
    return () => { cancelled = true; };
  }, [itemId, intervalDays]);

  return status;
}