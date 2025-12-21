import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';

interface UpdateAvailable {
  available: boolean;
  newWorker: ServiceWorker | null;
}

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateAvailable>({
    available: false,
    newWorker: null,
  });

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const handleSWUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();

        if (!registration) {
          logger.warn('useAppUpdate', 'No service worker registration found');
          return;
        }

        logger.info('useAppUpdate', 'Checking for SW updates...');

        // Check for updates regularly (every 1 hour)
        const checkInterval = setInterval(async () => {
          try {
            await registration.update();
            logger.info('useAppUpdate', 'Checked for updates');
          } catch (error) {
            logger.error('useAppUpdate', 'Update check failed', error);
          }
        }, 60 * 60 * 1000); // 1 hour

        // Also check immediately
        await registration.update();

        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (!newWorker) return;

          logger.info('useAppUpdate', 'New service worker found');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW is ready, old one still controlling
              logger.info('useAppUpdate', 'New SW installed, update available');
              setUpdateAvailable({
                available: true,
                newWorker: newWorker,
              });
            }
          });
        });

        return () => clearInterval(checkInterval);
      } catch (error) {
        logger.error('useAppUpdate', 'SW update listener error', error);
      }
    };

    handleSWUpdate();
  }, []);

  /**
   * Force app update by reloading
   */
  const applyUpdate = () => {
    if (updateAvailable.newWorker) {
      logger.info('useAppUpdate', 'Applying update...');

      // Tell the new service worker to skip waiting
      updateAvailable.newWorker.postMessage({ type: 'SKIP_WAITING' });

      // Reload the page when the new SW takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          logger.info('useAppUpdate', 'Reloading app with new version');
          window.location.reload();
        }
      });
    }
  };

  /**
   * Dismiss update prompt (user can apply later)
   */
  const dismissUpdate = () => {
    setUpdateAvailable({
      available: false,
      newWorker: null,
    });
  };

  return {
    updateAvailable: updateAvailable.available,
    applyUpdate,
    dismissUpdate,
  };
}