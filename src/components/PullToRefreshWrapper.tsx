import { ReactNode } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface Props {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}

const THRESHOLD = 72;

/** Touch pull-to-refresh. The hook drives the indicator height/opacity directly via the ref. */
export function PullToRefreshWrapper({ onRefresh, children, disabled }: Props) {
  const { t } = useTranslation();
  const { indicatorRef, isRefreshing, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel } =
    usePullToRefresh({ onRefresh, threshold: THRESHOLD, disabled });

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      <div
        ref={indicatorRef}
        aria-live="polite"
        className="flex items-center justify-center overflow-hidden"
        style={{ height: 0, opacity: 0 }}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.refreshing")}
            </>
          ) : (
            <>
              <ArrowDown className="h-4 w-4" />
              {t("common.release_to_refresh")}
            </>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
