import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { isNative } from '@/services/platform';
import {
  checkNativeNotificationPermission,
  requestNativeNotificationPermission,
  showNativeNotification,
} from '@/services/native/notifications';

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  action: string;
  title: string;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [error, setError] = useState<string | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isNative()) {
      // Native: LocalNotifications immer verfügbar
      setIsSupported(true);
      checkNativeNotificationPermission().then(setPermission);
      return;
    }

    // Web/PWA: Service Worker + Notification API
    const supported = 'serviceWorker' in navigator && 'Notification' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // ── requestPermission ─────────────────────────────────────────────────────
  const requestPermission = async (): Promise<boolean> => {
    // ── Native ──
    if (isNative()) {
      try {
        const result = await requestNativeNotificationPermission();
        setPermission(result);
        if (result === 'granted') {
          setTimeout(() => {
            showNativeNotification({
              title: 'RigFlow',
              body: 'Benachrichtigungen sind aktiviert! 🎉',
              tag: 'welcome',
            });
          }, 500);
        }
        return result === 'granted';
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Fehler beim Anfordern der Permission';
        setError(message);
        logger.error('usePushNotifications', 'Native permission error', err);
        return false;
      }
    }

    // ── Web ──
    if (!isSupported) {
      const msg = 'Push-Benachrichtigungen werden nicht unterstützt';
      setError(msg);
      logger.warn('usePushNotifications', msg);
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setTimeout(() => {
          sendNotification({
            title: 'RigFlow',
            body: 'Benachrichtigungen sind aktiviert! 🎉',
            tag: 'welcome',
          });
        }, 500);
      }
      return result === 'granted';
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Fehler beim Anfordern der Permission';
      setError(message);
      logger.error('usePushNotifications', 'Web permission error', err);
      return false;
    }
  };

  // ── sendNotification ──────────────────────────────────────────────────────
  const sendNotification = async (options: PushNotificationOptions): Promise<void> => {
    // ── Native ──
    if (isNative()) {
      if (permission !== 'granted') {
        logger.warn('usePushNotifications', 'Native: permission not granted');
        return;
      }
      try {
        await showNativeNotification({
          title: options.title,
          body: options.body,
          tag: options.tag,
          requireInteraction: options.requireInteraction,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Fehler beim Senden der Notification';
        setError(message);
        logger.error('usePushNotifications', 'Native send error', err);
      }
      return;
    }

    // ── Web ──
    const currentPermission = Notification.permission;
    if (!isSupported || currentPermission !== 'granted') {
      logger.warn('usePushNotifications', 'Web: notifications not available', {
        currentPermission,
      });
      return;
    }

    try {
      const notificationOptions: NotificationOptions = {
        body: options.body,
        icon: options.icon || '/pwa-192x192.png',
        badge: options.badge || '/favicon-32x32.png',
        tag: options.tag || 'default',
        requireInteraction: options.requireInteraction || false,
      };

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(options.title, notificationOptions);
      } else {
        new Notification(options.title, notificationOptions);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Fehler beim Senden der Notification';
      setError(message);
      logger.error('usePushNotifications', 'Web send error', err);
    }
  };

  // ── notifyError ───────────────────────────────────────────────────────────
  const notifyError = async (title: string, message: string): Promise<void> => {
    const currentPermission = isNative() ? permission : Notification.permission;
    if (currentPermission !== 'granted') return;

    await sendNotification({
      title: `❌ ${title}`,
      body: message,
      tag: 'error',
      requireInteraction: true,
    });
  };

  // ── SW Message Listener (Web only) ────────────────────────────────────────
  useEffect(() => {
    if (isNative() || !('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        logger.info('usePushNotifications', 'Notification clicked', event.data);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  const isBackgroundMode = (): boolean => !document.hasFocus();

  return {
    isSupported,
    permission,
    error,
    isBackgroundMode,
    requestPermission,
    sendNotification,
    notifyError,
  };
}