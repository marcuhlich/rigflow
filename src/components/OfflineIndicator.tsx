import { useEffect, useState } from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw, Check } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineQueue } from '@/lib/offlineQueue';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  // Check pending operations periodically
  useEffect(() => {
    const checkPending = () => {
      setPendingCount(offlineQueue.getPendingCount());
    };
    
    checkPending();
    const interval = setInterval(checkPending, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming back online
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
          title: 'Synchronisierung abgeschlossen',
          description: `${success} Änderung(en) hochgeladen${failed > 0 ? `, ${failed} fehlgeschlagen` : ''}.`,
        });
      }
      
      if (failed > 0) {
        toast({
          title: 'Synchronisierungsfehler',
          description: `${failed} Änderung(en) konnten nicht hochgeladen werden.`,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSyncing(false);
      setPendingCount(offlineQueue.getPendingCount());
    }
  };

  // Don't show anything if online and no pending operations
  if (isOnline && pendingCount === 0 && !showSuccess && !wasOffline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-left">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline</span>
        </div>
      )}

      {/* Pending operations indicator */}
      {pendingCount > 0 && (
        <div 
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-left",
            isOnline 
              ? "bg-primary/90 text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          )}
        >
          {isSyncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <CloudOff className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {isSyncing 
              ? 'Synchronisiere...' 
              : `${pendingCount} ausstehend`
            }
          </span>
        </div>
      )}

      {/* Success indicator */}
      {showSuccess && (
        <div className="flex items-center gap-2 bg-green-500/90 text-white px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-left">
          <Check className="h-4 w-4" />
          <span className="text-sm font-medium">Synchronisiert</span>
        </div>
      )}

      {/* Back online indicator */}
      {wasOffline && isOnline && pendingCount === 0 && !showSuccess && (
        <div className="flex items-center gap-2 bg-green-500/90 text-white px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-left">
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Wieder online</span>
        </div>
      )}
    </div>
  );
}
