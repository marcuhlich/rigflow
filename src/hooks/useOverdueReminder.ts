import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { logger } from '@/lib/logger';

const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
const STORAGE_KEY = 'rigflow_last_overdue_check';

/**
 * Checks for overdue lending items and sends push notifications.
 * Runs on app load, visibility change, and every 4 hours.
 */
export function useOverdueReminder() {
  const { user } = useAuth();
  const { permission, sendNotification } = usePushNotifications();
  const checkingRef = useRef(false);

  const checkOverdue = async () => {
    if (!user || permission !== 'granted' || checkingRef.current) return;

    // Throttle: don't check more than once per hour
    const lastCheck = localStorage.getItem(STORAGE_KEY);
    if (lastCheck && Date.now() - parseInt(lastCheck, 10) < 60 * 60 * 1000) return;

    checkingRef.current = true;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('lending_history')
        .select('item_name, lent_to, due_date')
        .eq('user_id', user.id)
        .is('returned_at', null)
        .not('due_date', 'is', null)
        .lt('due_date', today);

      if (error) throw error;

      if (data && data.length > 0) {
        const count = data.length;

        if (count === 1) {
          const item = data[0];
          const daysOverdue = Math.floor(
            (new Date(today).getTime() - new Date(item.due_date!).getTime()) / 86400000
          );
          await sendNotification({
            title: '⚠️ Überfällige Rückgabe',
            body: `"${item.item_name}" an ${item.lent_to} ist seit ${daysOverdue} Tag(en) überfällig.`,
            tag: 'overdue-reminder',
            requireInteraction: true,
          });
        } else {
          await sendNotification({
            title: `⚠️ ${count} überfällige Rückgaben`,
            body: `${data.map(d => d.item_name).slice(0, 3).join(', ')}${count > 3 ? ` und ${count - 3} weitere` : ''} – bitte Rückgabe prüfen.`,
            tag: 'overdue-reminder',
            requireInteraction: true,
          });
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

  useEffect(() => {
    if (!user || permission !== 'granted') return;

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
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, permission]);
}
