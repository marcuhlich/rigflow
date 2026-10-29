import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CloudOff, RefreshCw, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { offlineQueue } from "@/lib/offlineQueue";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** The queue lives in localStorage without change events, so we poll it. */
const POLL_MS = 2000;
const SUCCESS_VISIBLE_MS = 2000;

/**
 * Small status pill above the mobile tab bar / next to the desktop sidebar.
 * Shows offline state and pending changes, and syncs the offline queue
 * when the connection returns. Only one sync runs at a time.
 */
export function OfflineIndicator() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isOnline, wasOffline } = useOnlineStatus();

  const [pendingCount, setPendingCount] = useState(() => offlineQueue.getPendingCount());
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const syncingRef = useRef(false);
  const mountedRef = useRef(true);
  const successTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.clearTimeout(successTimer.current);
    };
  }, []);

  const refreshCount = useCallback(() => {
    setPendingCount(offlineQueue.getPendingCount());
  }, []);

  // Keep the pending count fresh: polling + other tabs + returning to the app
  useEffect(() => {
    refreshCount();
    const interval = window.setInterval(refreshCount, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") refreshCount(); };
    window.addEventListener("storage", refreshCount);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", refreshCount);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshCount]);

  const sync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const { success, failed } = await offlineQueue.syncQueue();
      if (!mountedRef.current) return;

      if (success > 0) {
        setShowSuccess(true);
        window.clearTimeout(successTimer.current);
        successTimer.current = window.setTimeout(() => {
          if (mountedRef.current) setShowSuccess(false);
        }, SUCCESS_VISIBLE_MS);
        toast({
          title: t("offline.sync_completed"),
          description: t("offline.sync_completed_description", { success, failed }),
        });
      }
      if (failed > 0) {
        toast({
          title: t("offline.sync_error"),
          description: t("offline.sync_error_description", { failed }),
          variant: "destructive",
        });
      }
    } catch (err) {
      logger.error("OfflineIndicator", "Sync failed", err instanceof Error ? err.message : err);
    } finally {
      syncingRef.current = false;
      if (mountedRef.current) {
        setIsSyncing(false);
        refreshCount();
      }
    }
  }, [refreshCount, t, toast]);

  // Auto-sync when online with pending changes. Re-runs only when the
  // count changes, so failed operations don't cause a retry loop.
  useEffect(() => {
    if (isOnline && pendingCount > 0) void sync();
  }, [isOnline, pendingCount, sync]);

  const showBackOnline = wasOffline && isOnline && pendingCount === 0 && !showSuccess;
  if (isOnline && pendingCount === 0 && !showSuccess && !showBackOnline) return null;

  let Icon = WifiOff;
  let label: string = t("offline.offline");
  let tone = "text-destructive";
  if (isOnline && isSyncing) {
    Icon = RefreshCw; label = t("offline.syncing"); tone = "text-muted-foreground";
  } else if (pendingCount > 0) {
    Icon = CloudOff;
    label = isOnline ? t("offline.pending_count", { count: pendingCount }) : `${t("offline.offline")} · ${t("offline.pending_count", { count: pendingCount })}`;
    tone = isOnline ? "text-warning" : "text-destructive";
  } else if (showSuccess) {
    Icon = Check; label = t("offline.synced"); tone = "text-success";
  } else if (showBackOnline) {
    Icon = Check; label = t("offline.back_online"); tone = "text-success";
  }

  // Tapping retries a sync that left changes behind
  const canRetry = isOnline && pendingCount > 0 && !isSyncing;

  return (
    <div
      className="pointer-events-none fixed left-3 z-50 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.5rem)] lg:bottom-4 lg:left-64"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={canRetry ? () => void sync() : undefined}
        disabled={!canRetry}
        className={cn(
          "pointer-events-auto flex h-8 items-center gap-2 rounded-md border border-border bg-popover px-2.5 text-xs font-medium text-foreground shadow-md shadow-black/5",
          "animate-in fade-in-0 slide-in-from-bottom-1 duration-150",
          canRetry ? "cursor-pointer hover:border-border-strong" : "cursor-default"
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", tone, isOnline && isSyncing && "animate-spin")} />
        <span className="tabular-nums">{label}</span>
        {canRetry && <RefreshCw className="h-3 w-3 text-muted-foreground" aria-label={t("common.retry")} />}
      </button>
    </div>
  );
}
