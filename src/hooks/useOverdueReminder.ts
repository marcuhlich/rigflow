import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { logger } from '@/lib/logger';
import { toLocalDateString } from '@/lib/utils';

const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
const STORAGE_KEY = 'rigflow_last_overdue_check';

/**
 * Checks for overdue lending items and sends push notifications.
 * Runs on app load, visibility change, and every 4 hours.
 */
export function useOverdueReminder() {
  const { user } = useAuth();
  const userId = user?.id;
  const { permission, notifyLoanReminder, notifyLoanReminderMultiple } = useNotifications();
  const checkingRef = useRef(false);

  // Keep the latest notifier functions without re-arming timers/listeners on every render
  const notifiersRef = useRef({ notifyLoanReminder, notifyLoanReminderMultiple });
  useEffect(() => {
    notifiersRef.current = { notifyLoanReminder, notifyLoanReminderMultiple };
  }, [notifyLoanReminder, notifyLoanReminderMultiple]);

  useEffect(() => {
    if (!userId || permission !== 'granted') return;
    let active = true;

    const checkOverdue = async () => {
      if (!active || checkingRef.current) return;

      // Throttle: don't check more than once per hour
      const lastCheck = localStorage.getItem(STORAGE_KEY);
      if (lastCheck && Date.now() - parseInt(lastCheck, 10) < 60 * 60 * 1000) return;

      checkingRef.current = true;

      try {
        const today = toLocalDateString();

        const { data, error } = await supabase
          .from('lending_history')
          .select('item_name, lent_to, due_date')
          .eq('user_id', userId)
          .is('returned_at', null)
          .not('due_date', 'is', null)
          .lt('due_date', today);

        if (error) throw error;
        if (!active) return;

        if (data && data.length > 0) {
          const count = data.length;
          const { notifyLoanReminder: notifyOne, notifyLoanReminderMultiple: notifyMany } = notifiersRef.current;

          if (count === 1) {
            const item = data[0];
            // Fix: append time to avoid timezone-off-by-one
            const daysOverdue = Math.floor(
              (Date.now() - new Date(item.due_date + 'T00:00:00').getTime()) / 86400000
            );
            await notifyOne(item.item_name, daysOverdue);
          } else {
            await notifyMany(data.map(d => d.item_name));
          }

          logger.info('OverdueReminder', `Sent notification for ${count} overdue item(s)`);
        }

        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch (err) {
        logger.error('OverdueReminder', 'Failed to check overdue items', err);
      } finally {
        checkingRef.current = false;
      }
    };

    // Check on mount
    checkOverdue();

    // Check periodically
    const interval = setInterval(checkOverdue, CHECK_INTERVAL);

    // Check when app becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkOverdue();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userId, permission]);
}
