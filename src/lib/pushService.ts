import { logger } from '@/lib/logger';

export interface PushServiceConfig {
  enableNotifications: boolean;
  enableBackground: boolean;
  notificationTimeout: number;
}

const DEFAULT_CONFIG: PushServiceConfig = {
  enableNotifications: true,
  enableBackground: true,
  notificationTimeout: 5000,
};

export class PushService {
  private static config: PushServiceConfig = DEFAULT_CONFIG;
  private static swRegistration: ServiceWorkerRegistration | null = null;

  /**
   * Initialize push service — nutzt den von vite-plugin-pwa generierten SW
   */
  static async initialize(config: Partial<PushServiceConfig> = {}): Promise<boolean> {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (!('serviceWorker' in navigator)) {
      logger.warn('PushService', 'Service Workers not supported');
      return false;
    }

    try {
      // NICHT selbst registrieren — vite-plugin-pwa macht das automatisch.
      // Wir warten einfach bis der SW bereit ist.
      this.swRegistration = await navigator.serviceWorker.ready;
      logger.info('PushService', 'Service Worker ready', {
        scope: this.swRegistration.scope,
      });
      return true;
    } catch (error) {
      logger.error('PushService', 'Service Worker not ready', error);
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

    if (Notification.permission === 'granted') return 'granted';

    if (Notification.permission !== 'denied') {
      try {
        return await Notification.requestPermission();
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
      Notification.permission === 'granted' &&
      this.swRegistration !== null
    );
  }

  /**
   * Show notification — immer über den SW (funktioniert Foreground + Background + PWA)
   */
  static async showNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    if (!this.isNotificationAvailable()) {
      logger.warn('PushService', 'Notifications not available', {
        permission: Notification.permission,
        swReady: !!this.swRegistration,
      });
      return;
    }

    try {
      await this.swRegistration!.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/badge-96x96.png',
        ...options,
      });
    } catch (error) {
      logger.error('PushService', 'Failed to show notification', error);
    }
  }

  /**
   * Register background sync
   */
  static async registerBackgroundSync(tag: string): Promise<boolean> {
    if (!this.swRegistration) return false;

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
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;

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
    if (!('serviceWorker' in navigator)) return () => {};

    const handler = (event: MessageEvent) => callback(event.data);
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }

  /**
   * Clear all cached data
   */
  static async clearCache(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      logger.info('PushService', 'Cache cleared');
    } catch (error) {
      logger.error('PushService', 'Failed to clear cache', error);
    }
  }

  /**
   * Get service worker registration info
   */
  static getRegistrationInfo() {
    if (!this.swRegistration) return { registered: false };

    return {
      registered: true,
      scope: this.swRegistration.scope,
      installing: !!this.swRegistration.installing,
      waiting: !!this.swRegistration.waiting,
      active: !!this.swRegistration.active,
    };
  }
}