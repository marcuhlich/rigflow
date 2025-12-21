import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

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

  // Check if push notifications are supported and listen for permission changes
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      // Set initial permission
      setPermission(Notification.permission);
      
      // Log permission status
      console.log('[usePushNotifications] Permission:', Notification.permission);
    }
  }, []);

  /**
   * Request notification permission from user
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      const msg = 'Push-Benachrichtigungen werden nicht unterstützt';
      setError(msg);
      logger.warn('usePushNotifications', msg);
      return false;
    }

    try {
      console.log('[usePushNotifications] Requesting permission...');
      const result = await Notification.requestPermission();
      console.log('[usePushNotifications] Permission result:', result);
      
      setPermission(result);
      
      if (result === 'granted') {
        logger.info('usePushNotifications', 'Permission granted');
        // Kurz warten dann Notification testen
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
      const message = err instanceof Error ? err.message : 'Fehler beim Anfordern der Permission';
      setError(message);
      logger.error('usePushNotifications', 'Permission request error', err);
      return false;
    }
  };

  /**
   * Send a local notification
   */
  const sendNotification = async (options: PushNotificationOptions): Promise<void> => {
    // Immer aktuelles Permission checken
    const currentPermission = Notification.permission;
    
    if (!isSupported) {
      logger.warn('usePushNotifications', 'Notifications not supported');
      return;
    }

    if (currentPermission !== 'granted') {
      logger.warn('usePushNotifications', 'Notification permission not granted', { currentPermission });
      return;
    }

    try {
      console.log('[usePushNotifications] Sending notification:', options.title);

      // Send to service worker if registered
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.log('[usePushNotifications] Posting message to SW');
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          data: options,
        });
      }

      // Also show locally if app is in foreground
      if (document.hasFocus()) {
        console.log('[usePushNotifications] App in foreground, showing notification');
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/pwa-192x192.png',
          badge: options.badge || '/favicon-32x32.png',
          tag: options.tag || 'default',
          requireInteraction: options.requireInteraction || false,
        });
      } else {
        console.log('[usePushNotifications] App in background');
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
    // Checke Permission vor dem Senden
    if (Notification.permission !== 'granted') {
      console.log('[usePushNotifications] Skipping notifySync - no permission');
      return;
    }

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
    // Checke Permission vor dem Senden
    if (Notification.permission !== 'granted') {
      console.log('[usePushNotifications] Skipping notifyOffline - no permission');
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
    // Checke Permission vor dem Senden
    if (Notification.permission !== 'granted') {
      console.log('[usePushNotifications] Skipping notifyOnline - no permission');
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
    // Checke Permission vor dem Senden
    if (Notification.permission !== 'granted') {
      console.log('[usePushNotifications] Skipping notifyError - no permission');
      return;
    }

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
      console.log('[usePushNotifications] SW Message:', event.data.type);
      if (event.data.type === 'NOTIFICATION_CLICK') {
        logger.info('usePushNotifications', 'Notification clicked', event.data);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  /**
   * Check if app is in background
   */
  const isBackgroundMode = (): boolean => {
    return !document.hasFocus();
  };

  return {
    isSupported,
    permission,
    error,
    isBackgroundMode,
    requestPermission,
    sendNotification,
    notifySync,
    notifyOffline,
    notifyOnline,
    notifyError,
  };
}