import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';

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
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      logger.warn('useAppUpdate', 'Service Worker not supported');
      toast({
        title: 'Browser nicht unterstützt',
        description: 'Dein Browser unterstützt keine Service Worker',
        variant: 'destructive',
      });
      return;
    }

    const handleSWUpdate = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();

        if (!registration) {
          logger.warn('useAppUpdate', 'No service worker registration found');
          // Try to find if SW is registered at all
          const registrations = await navigator.serviceWorker.getRegistrations();
          logger.info('useAppUpdate', `Found ${registrations.length} registrations`);
          return;
        }

        logger.info('useAppUpdate', 'SW Registration found:', {
          active: !!registration.active,
          waiting: !!registration.waiting,
          installing: !!registration.installing,
        });

        // Check for updates regularly (every 1 hour)
        const checkInterval = setInterval(async () => {
          try {
            logger.info('useAppUpdate', 'Running periodic update check...');
            await registration.update();
            logger.info('useAppUpdate', 'Update check completed');
          } catch (error) {
            logger.error('useAppUpdate', 'Update check failed', error);
          }
        }, 60 * 60 * 1000); // 1 hour

        // Also check immediately
        logger.info('useAppUpdate', 'Checking for updates immediately...');
        await registration.update();

        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (!newWorker) {
            logger.warn('useAppUpdate', 'updatefound fired but no installing worker');
            return;
          }

          logger.info('useAppUpdate', 'New service worker found, state:', newWorker.state);

          newWorker.addEventListener('statechange', () => {
            logger.info('useAppUpdate', 'SW state changed to:', newWorker.state);

            if (newWorker.state === 'installed') {
              logger.info('useAppUpdate', 'SW installed, controller exists:', !!navigator.serviceWorker.controller);

              if (navigator.serviceWorker.controller) {
                // New SW is ready, old one still controlling
                logger.info('useAppUpdate', 'Update available!');
                setUpdateAvailable({
                  available: true,
                  newWorker: newWorker,
                });

                // Show toast notification as backup
                toast({
                  title: '🚀 Update verfügbar',
                  description: 'Eine neue Version ist bereit',
                });
              } else {
                logger.info('useAppUpdate', 'First install, no update prompt needed');
              }
            }
          });
        });

        // Check if there's already a waiting SW (page was opened while SW was waiting)
        if (registration.waiting && navigator.serviceWorker.controller) {
          logger.info('useAppUpdate', 'SW already waiting on page load');
          setUpdateAvailable({
            available: true,
            newWorker: registration.waiting,
          });

          toast({
            title: '🚀 Update verfügbar',
            description: 'Eine neue Version wurde gefunden',
          });
        }

        return () => clearInterval(checkInterval);
      } catch (error) {
        logger.error('useAppUpdate', 'SW update listener error', error);
      }
    };

    handleSWUpdate();

    // Also listen for messages from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      logger.info('useAppUpdate', 'Message from SW:', event.data);
      if (event.data?.type === 'SW_UPDATE_AVAILABLE') {
        toast({
          title: '🚀 Update verfügbar',
          description: 'Service Worker hat Update erkannt',
        });
      }
    });
  }, []);

  /**
   * Force app update by reloading
   */
  const applyUpdate = () => {
    if (updateAvailable.newWorker) {
      logger.info('useAppUpdate', 'Applying update...');

      // Setup listener for controllerchange BEFORE sending message
      let refreshing = false;
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          logger.info('useAppUpdate', 'Reloading app with new version');
          window.location.reload();
        }
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      // Tell the new service worker to skip waiting
      logger.info('useAppUpdate', 'Sending SKIP_WAITING message to SW');
      updateAvailable.newWorker.postMessage({ type: 'SKIP_WAITING' });

      // Fallback: reload after 2 seconds if controllerchange doesn't fire
      setTimeout(() => {
        if (!refreshing) {
          logger.warn('useAppUpdate', 'controllerchange timeout, forcing reload');
          window.location.reload();
        }
      }, 2000);
    } else {
      // No new worker available, just reload
      logger.info('useAppUpdate', 'No new worker, reloading anyway');
      window.location.reload();
    }
  };

  /**
   * Dismiss update prompt (user can apply later)
   */
  const dismissUpdate = () => {
    logger.info('useAppUpdate', 'Update dismissed by user');
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