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
  const { indicatorRef, isRefreshing, onTouchStart, onTouchMove, onTouchEnd } =
    usePullToRefresh({ onRefresh, threshold: THRESHOLD, disabled });

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ userSelect: "none" }}
    >
      {/* Indicator — wird direkt per DOM manipuliert, kein Re-render */}
      <div
        ref={indicatorRef}
        style={{
          height: 0,
          opacity: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isRefreshing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground font-medium">Wird aktualisiert…</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: "2px solid hsl(var(--primary) / 0.3)",
              borderTopColor: "hsl(var(--primary))",
            }} />
            <span className="text-xs text-muted-foreground font-medium">Loslassen zum Aktualisieren</span>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}