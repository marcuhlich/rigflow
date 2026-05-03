/**
 * Native Local Notifications via @capacitor/local-notifications
 * Wird nur aufgerufen wenn isNative() === true
 */
import { LocalNotifications } from '@capacitor/local-notifications';
import { logger } from '@/lib/logger';

export interface NativeNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Mappt Capacitor PermissionState → Web NotificationPermission
 * Capacitor: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'
 * Web:       'default' | 'granted' | 'denied'
 */
function mapPermission(state: string): NotificationPermission {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'default'; // 'prompt' | 'prompt-with-rationale' → noch nicht gefragt
}

/**
 * Tag-String → stabiler numerischer ID (für replace-Verhalten wie Web-tags)
 */
function tagToId(tag?: string): number {
  if (!tag) return Math.floor(Math.random() * 1_000_000);
  return Math.abs(
    tag.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)
  ) || 1;
}

export async function checkNativeNotificationPermission(): Promise<NotificationPermission> {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return mapPermission(display);
  } catch (err) {
    logger.warn('NativeNotifications', 'checkPermissions failed', err);
    return 'default';
  }
}

export async function requestNativeNotificationPermission(): Promise<NotificationPermission> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    logger.info('NativeNotifications', 'Permission result:', display);
    return mapPermission(display);
  } catch (err) {
    logger.error('NativeNotifications', 'requestPermissions failed', err);
    return 'denied';
  }
}

export async function showNativeNotification(
  options: NativeNotificationOptions
): Promise<void> {
  const id = tagToId(options.tag);

  try {
    // Bestehende Notification mit gleichem Tag canceln (= Web-Tag-Verhalten)
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    // Ignorieren – kann fehlschlagen wenn keine existiert
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: options.title,
          body: options.body,
          // Sofort anzeigen (100ms Puffer für Android)
          schedule: { at: new Date(Date.now() + 100) },
          // ongoing = bleibt bis User wegwischt (entspricht requireInteraction)
          ongoing: options.requireInteraction ?? false,
          autoCancel: true,
          smallIcon: 'ic_stat_rigflow', // res/drawable – Fallback auf App-Icon
          iconColor: '#6366f1', // Indigo – RigFlow Brand
        },
      ],
    });
    logger.info('NativeNotifications', `Shown: "${options.title}" (id=${id})`);
  } catch (err) {
    logger.error('NativeNotifications', 'schedule failed', err);
    throw err;
  }
}