import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string; // Grouping tag for notifications
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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  /**
   * Request notification permission from user
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push-Benachrichtigungen werden nicht unterstützt');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Anfordern der Permission';
      setError(message);
      logger.error('usePushNotifications', 'Permission request error', err);
      return false;
    }
  };

  /**
   * Send a local notification (when app is in foreground)
   */
  const sendNotification = async (options: PushNotificationOptions): Promise<void> => {
    if (!isSupported || permission !== 'granted') {
      logger.warn('usePushNotifications', 'Notifications not available');
      return;
    }

    try {
      // Send to service worker if registered
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          data: options,
        });
      }

      // Also show locally if app is in foreground
      if (document.hasFocus()) {
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/pwa-192x192.png',
          badge: options.badge || '/favicon-32x32.png',
          tag: options.tag || 'default',
          requireInteraction: options.requireInteraction || false,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Senden der Notification';
      setError(message);
      logger.error('usePushNotifications', 'Send notification error', err);
    }
  };

  /**
   * Send sync success notification
   */
  const notifySync = async (itemsCount: number, conflictCount: number = 0): Promise<void> => {
    const hasConflicts = conflictCount > 0;
    
    await sendNotification({
      title: hasConflicts ? '⚠️ Synchronisierung mit Konflikten' : '✅ Synchronisiert',
      body: hasConflicts
        ? `${itemsCount} Artikel synchronisiert, ${conflictCount} Konflikt(e) müssen aufgelöst werden.`
        : `${itemsCount} Artikel erfolgreich synchronisiert.`,
      tag: 'sync',
      icon: '/pwa-192x192.png',
      badge: '/favicon-32x32.png',
      requireInteraction: hasConflicts,
    });
  };

  /**
   * Send offline notification
   */
  const notifyOffline = async (): Promise<void> => {
    // Only notify if permissions granted
    if (permission !== 'granted') {
      return;
    }
    await sendNotification({
      title: '🔌 Offline',
      body: 'Du bist jetzt offline. Änderungen werden synchronisiert, wenn du wieder online bist.',
      tag: 'offline',
      requireInteraction: false,
    });
  };

  /**
   * Send online notification
   */
  const notifyOnline = async (): Promise<void> => {
    // Only notify if permissions granted
    if (permission !== 'granted') {
      return;
    }
    await sendNotification({
      title: '🟢 Online',
      body: 'Du bist wieder online. Synchronisierung läuft...',
      tag: 'online',
      requireInteraction: false,
    });
  };

  /**
   * Send error notification
   */
  const notifyError = async (title: string, message: string): Promise<void> => {
    await sendNotification({
      title: `❌ ${title}`,
      body: message,
      tag: 'error',
      requireInteraction: true,
    });
  };

  /**
   * Listen for messages from service worker
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data.type === 'NOTIFICATION_CLICK') {
        // Handle notification click
        logger.info('usePushNotifications', 'Notification clicked', event.data);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  /**
   * Check if notifications are currently active (app in background)
   */
  const isBackgroundMode = (): boolean => {
    return !document.hasFocus();
  };

  return {
    // State
    isSupported,
    permission,
    isSubscribed,
    error,
    isBackgroundMode,
    
    // Actions
    requestPermission,
    sendNotification,
    notifySync,
    notifyOffline,
    notifyOnline,
    notifyError,
  };
}