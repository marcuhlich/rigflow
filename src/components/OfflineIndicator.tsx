import { useEffect, useState } from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineQueue } from '@/lib/offlineQueue';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const { isOnline, wasOffline } = useOnlineStatus();

  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const checkPending = () => {
      setPendingCount(offlineQueue.getPendingCount());
    };

    checkPending();

    const interval = setInterval(checkPending, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      syncPendingOperations();
    }
  }, [isOnline, pendingCount]);

  const syncPendingOperations = async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);

    try {
      const { success, failed } = await offlineQueue.syncQueue();

      if (success > 0) {
        setShowSuccess(true);

        setTimeout(() => setShowSuccess(false), 2000);

        toast({
          title: t('offline.sync_completed'),
          description: t('offline.sync_completed_description', {
            success,
            failed,
          }),
        });
      }

      if (failed > 0) {
        toast({
          title: t('offline.sync_error'),
          description: t('offline.sync_error_description', {
            failed,
          }),
          variant: 'destructive',
        });
      }
    } finally {
      setIsSyncing(false);
      setPendingCount(offlineQueue.getPendingCount());
    }
  };

  if (isOnline && pendingCount === 0 && !showSuccess && !wasOffline) {
    return null;
  }

  return (
    <div className="fixed bottom-16 md:bottom-4 left-3 sm:left-4 z-50 flex flex-col gap-2">
      {!isOnline && (
        <div className="flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-left">
          <WifiOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />

          <span className="text-xs sm:text-sm font-medium">
            {t('offline.offline')}
          </span>
        </div>
      )}

      {pendingCount > 0 && (
        <div
          className={cn(
            'flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-left',
            isOnline
              ? 'bg-primary/90 text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isSyncing ? (
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
          ) : (
            <CloudOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}

          <span className="text-xs sm:text-sm font-medium">
            {isSyncing
              ? t('offline.syncing')
              : t('offline.pending_count', { count: pendingCount })}
          </span>
        </div>
      )}

      {showSuccess && (
        <div className="flex items-center gap-2 bg-primary/90 text-primary-foreground px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-left">
          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />

          <span className="text-xs sm:text-sm font-medium">
            {t('offline.synced')}
          </span>
        </div>
      )}

      {wasOffline && isOnline && pendingCount === 0 && !showSuccess && (
        <div className="flex items-center gap-2 bg-primary/90 text-primary-foreground px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-left">
          <Wifi className="h-3.5 w-3.5 sm:h-4 sm:w-4" />

          <span className="text-xs sm:text-sm font-medium">
            {t('offline.back_online')}
          </span>
        </div>
      )}
    </div>
  );
}