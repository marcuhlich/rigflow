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

/** Message posted by the service worker */
export interface ServiceWorkerMessage {
  type?: string;
  [key: string]: unknown;
}

/** How long to wait for `serviceWorker.ready` (never resolves when no SW is registered, e.g. dev/native). */
const SW_READY_TIMEOUT_MS = 10_000;

const hasNotificationApi = () => typeof window !== 'undefined' && 'Notification' in window;

export class PushService {
  private static config: PushServiceConfig = DEFAULT_CONFIG;
  private static swRegistration: ServiceWorkerRegistration | null = null;
  private static initPromise: Promise<boolean> | null = null;

  /**
   * Initialize push service — nutzt den von vite-plugin-pwa generierten SW.
   * Idempotent: repeated calls share the same initialization.
   */
  static initialize(config: Partial<PushServiceConfig> = {}): Promise<boolean> {
    this.config = { ...DEFAULT_CONFIG, ...config };
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize().then(ok => {
      // Allow a later retry if it didn't work (e.g. SW registered afterwards)
      if (!ok) this.initPromise = null;
      return ok;
    });
    return this.initPromise;
  }

  private static async doInitialize(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      logger.warn('PushService', 'Service Workers not supported');
      return false;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // NICHT selbst registrieren — vite-plugin-pwa macht das automatisch.
      // Wir warten bis der SW bereit ist – aber nicht ewig.
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS); }),
      ]);
      if (!registration) {
        logger.warn('PushService', 'Service Worker not ready (timeout)');
        return false;
      }
      this.swRegistration = registration;
      logger.info('PushService', 'Service Worker ready', {
        scope: registration.scope,
      });
      return true;
    } catch (error) {
      logger.error('PushService', 'Service Worker not ready', error);
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Request notification permission
   */
  static async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!hasNotificationApi()) {
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
      hasNotificationApi() &&
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
        permission: hasNotificationApi() ? Notification.permission : 'unsupported',
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
      const registration = this.swRegistration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      };
      if (registration.sync) {
        await registration.sync.register(tag);
        logger.info('PushService', 'Background sync registered', { tag });
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
  static async broadcastMessage(message: unknown): Promise<void> {
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
  static onMessage(callback: (message: ServiceWorkerMessage) => void): () => void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};

    const handler = (event: MessageEvent) => {
      const data: unknown = event.data;
      // Ignore non-object messages (e.g. from third-party SW code)
      if (!data || typeof data !== 'object') return;
      try {
        callback(data as ServiceWorkerMessage);
      } catch (error) {
        logger.error('PushService', 'SW message handler failed', error);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }

  /**
   * Clear all cached data
   */
  static async clearCache(): Promise<void> {
    if (typeof caches === 'undefined') return;
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