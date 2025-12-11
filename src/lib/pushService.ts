import { logger } from '@/lib/logger';

export interface PushServiceConfig {
  enableNotifications: boolean;
  enableBackground: boolean;
  notificationTimeout: number; // ms
}

const DEFAULT_CONFIG: PushServiceConfig = {
  enableNotifications: true,
  enableBackground: true,
  notificationTimeout: 5000,
};

/**
 * Push Service - Manages notifications and background sync
 * Works offline-first, browser-native
 */
export class PushService {
  private static config: PushServiceConfig = DEFAULT_CONFIG;
  private static swRegistration: ServiceWorkerRegistration | null = null;

  /**
   * Initialize push service and register service worker
   */
  static async initialize(config: Partial<PushServiceConfig> = {}): Promise<boolean> {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!('serviceWorker' in navigator)) {
      logger.warn('PushService', 'Service Workers not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.swRegistration = registration;
      logger.info('PushService', 'Service Worker registered successfully');

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            logger.info('PushService', 'New service worker available');
            // Notify app about update
            this.broadcastMessage({
              type: 'SW_UPDATE_AVAILABLE',
            });
          }
        });
      });

      return true;
    } catch (error) {
      logger.error('PushService', 'Failed to register service worker', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  static async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      logger.warn('PushService', 'Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        return permission;
      } catch (error) {
        logger.error('PushService', 'Failed to request notification permission', error);
        return 'denied';
      }
    }

    return 'denied';
  }

  /**
   * Check if notifications are available
   */
  static isNotificationAvailable(): boolean {
    return (
      this.config.enableNotifications &&
      'Notification' in window &&
      Notification.permission === 'granted'
    );
  }

  /**
   * Show notification
   */
  static async showNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    if (!this.isNotificationAvailable()) {
      logger.warn('PushService', 'Notifications not available');
      return;
    }

    try {
      // If app is in foreground, show directly
      if (document.hasFocus()) {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          badge: '/favicon-32x32.png',
          ...options,
        });
      } else if (this.swRegistration) {
        // If app is in background, use service worker
        this.swRegistration.showNotification(title, {
          icon: '/pwa-192x192.png',
          badge: '/favicon-32x32.png',
          ...options,
        });
      }
    } catch (error) {
      logger.error('PushService', 'Failed to show notification', error);
    }
  }

  /**
   * Register background sync
   */
  static async registerBackgroundSync(tag: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !this.swRegistration) {
      return false;
    }

    try {
      if ('sync' in this.swRegistration) {
        await (this.swRegistration as any).sync.register(tag);
        logger.info('PushService', 'Background sync registered:', tag);
        return true;
      }
    } catch (error) {
      logger.warn('PushService', 'Background sync not available:', error);
    }

    return false;
  }

  /**
   * Send message to service worker
   */
  static async broadcastMessage(message: any): Promise<void> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return;
    }

    try {
      navigator.serviceWorker.controller.postMessage(message);
    } catch (error) {
      logger.error('PushService', 'Failed to send message to SW', error);
    }
  }

  /**
   * Listen for messages from service worker
   */
  static onMessage(callback: (message: any) => void): () => void {
    if (!('serviceWorker' in navigator)) {
      return () => {};
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
      callback(event.data);
    });

    // Return unsubscribe function
    return () => {
      navigator.serviceWorker.removeEventListener('message', (event) => {
        callback(event.data);
      });
    };
  }

  /**
   * Clear all cached data
   */
  static async clearCache(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => caches.delete(name))
      );
      logger.info('PushService', 'Cache cleared');
    } catch (error) {
      logger.error('PushService', 'Failed to clear cache', error);
    }
  }

  /**
   * Get service worker registration info
   */
  static getRegistrationInfo() {
    if (!this.swRegistration) {
      return {
        registered: false,
      };
    }

    return {
      registered: true,
      scope: this.swRegistration.scope,
      updateViaCache: (this.swRegistration as any).updateViaCache,
      installing: !!this.swRegistration.installing,
      waiting: !!this.swRegistration.waiting,
      active: !!this.swRegistration.active,
    };
  }
}