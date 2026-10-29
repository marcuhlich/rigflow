import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const isWebNotificationSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;

/** Notification.permission without throwing on platforms that lack the API (e.g. iOS Safari outside a PWA). */
const getWebPermission = (): NotificationPermission =>
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';

/** serviceWorker.ready never resolves when no SW is registered – don't hang forever. */
async function getReadyRegistration(timeoutMs = 5000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(() => isNative() || isWebNotificationSupported());
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    isNative() ? 'default' : getWebPermission()
  );
  const [error, setError] = useState<string | null>(null);

  // Refs so the (stable) callbacks below always see current values
  const permissionRef = useRef(permission);
  permissionRef.current = permission;
  const isSupportedRef = useRef(isSupported);
  isSupportedRef.current = isSupported;

  const mountedRef = useRef(true);
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePermission = useCallback((value: NotificationPermission) => {
    permissionRef.current = value;
    if (mountedRef.current) setPermission(value);
  }, []);

  const reportError = useCallback((message: string) => {
    if (mountedRef.current) setError(message);
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    if (isNative()) {
      // Native: LocalNotifications immer verfügbar
      setIsSupported(true);
      checkNativeNotificationPermission().then(updatePermission);
    } else {
      // Web/PWA: Service Worker + Notification API
      const supported = isWebNotificationSupported();
      setIsSupported(supported);
      if (supported) updatePermission(Notification.permission);
    }

    return () => {
      mountedRef.current = false;
      if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    };
  }, [updatePermission]);

  // ── sendNotification ──────────────────────────────────────────────────────
  const sendNotification = useCallback(async (options: PushNotificationOptions): Promise<void> => {
    // ── Native ──
    if (isNative()) {
      if (permissionRef.current !== 'granted') {
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
        reportError(message);
        logger.error('usePushNotifications', 'Native send error', err);
      }
      return;
    }

    // ── Web ──
    const currentPermission = getWebPermission();
    if (!isWebNotificationSupported() || currentPermission !== 'granted') {
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

      const registration = await getReadyRegistration();
      if (registration) {
        await registration.showNotification(options.title, notificationOptions);
      } else {
        new Notification(options.title, notificationOptions);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Fehler beim Senden der Notification';
      reportError(message);
      logger.error('usePushNotifications', 'Web send error', err);
    }
  }, [reportError]);

  const scheduleWelcome = useCallback((show: () => unknown) => {
    if (welcomeTimerRef.current) clearTimeout(welcomeTimerRef.current);
    welcomeTimerRef.current = setTimeout(() => {
      welcomeTimerRef.current = null;
      Promise.resolve(show()).catch(err =>
        logger.warn('usePushNotifications', 'Welcome notification failed', err)
      );
    }, 500);
  }, []);

  // ── requestPermission ─────────────────────────────────────────────────────
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // ── Native ──
    if (isNative()) {
      try {
        const result = await requestNativeNotificationPermission();
        updatePermission(result);
        if (result === 'granted') {
          scheduleWelcome(() =>
            showNativeNotification({
              title: 'RigFlow',
              body: 'Benachrichtigungen sind aktiviert! 🎉',
              tag: 'welcome',
            })
          );
        }
        return result === 'granted';
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Fehler beim Anfordern der Permission';
        reportError(message);
        logger.error('usePushNotifications', 'Native permission error', err);
        return false;
      }
    }

    // ── Web ──
    if (!isSupportedRef.current || !isWebNotificationSupported()) {
      const msg = 'Push-Benachrichtigungen werden nicht unterstützt';
      reportError(msg);
      logger.warn('usePushNotifications', msg);
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      updatePermission(result);
      if (result === 'granted') {
        scheduleWelcome(() =>
          sendNotification({
            title: 'RigFlow',
            body: 'Benachrichtigungen sind aktiviert! 🎉',
            tag: 'welcome',
          })
        );
      }
      return result === 'granted';
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Fehler beim Anfordern der Permission';
      reportError(message);
      logger.error('usePushNotifications', 'Web permission error', err);
      return false;
    }
  }, [updatePermission, reportError, scheduleWelcome, sendNotification]);

  // ── notifyError ───────────────────────────────────────────────────────────
  const notifyError = useCallback(async (title: string, message: string): Promise<void> => {
    const currentPermission = isNative() ? permissionRef.current : getWebPermission();
    if (currentPermission !== 'granted') return;

    await sendNotification({
      title: `❌ ${title}`,
      body: message,
      tag: 'error',
      requireInteraction: true,
    });
  }, [sendNotification]);

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

  const isBackgroundMode = useCallback((): boolean => !document.hasFocus(), []);

  return useMemo(() => ({
    isSupported,
    permission,
    error,
    isBackgroundMode,
    requestPermission,
    sendNotification,
    notifyError,
  }), [isSupported, permission, error, isBackgroundMode, requestPermission, sendNotification, notifyError]);
}
