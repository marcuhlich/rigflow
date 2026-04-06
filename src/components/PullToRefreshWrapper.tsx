import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface Props {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}

export function PullToRefreshWrapper({ onRefresh, children, disabled }: Props) {
  const THRESHOLD = 72;
  const { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd } =
    usePullToRefresh({ onRefresh, threshold: THRESHOLD, disabled });

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const indicatorVisible = pullDistance > 4 || isRefreshing;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ userSelect: "none" }}
    >
      {/* Indicator */}
      <div
        style={{
          height: isRefreshing ? 56 : pullDistance,
          transition: isRefreshing || pullDistance === 0
            ? "height 0.3s cubic-bezier(0.34,1.56,0.64,1)"
            : "none",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {indicatorVisible && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: progress,
              transform: `scale(${0.6 + progress * 0.4})`,
              transition: isRefreshing ? "opacity 0.2s" : "none",
            }}
          >
            {isRefreshing ? (
              <Loader2
                className="h-5 w-5 text-primary animate-spin"
              />
            ) : (
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "2px solid hsl(var(--primary) / 0.3)",
                  borderTopColor: "hsl(var(--primary))",
                  transform: `rotate(${progress * 720}deg)`,
                  transition: "none",
                }}
              />
            )}
            <span className="text-xs text-muted-foreground font-medium">
              {isRefreshing
                ? "Wird aktualisiert…"
                : progress >= 1
                  ? "Loslassen zum Aktualisieren"
                  : "Nach unten ziehen"}
            </span>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}