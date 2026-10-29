import { ReactNode } from "react";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Centered spinner for full-page/route loading. */
export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-[40vh] items-center justify-center", className)}>
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Generic list skeleton, use while a list query is pending. */
export function ListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("surface divide-y divide-border overflow-hidden", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

interface ErrorStateProps {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}

/** Inline error panel for failed queries. Never leaves the user on a blank page. */
export function ErrorState({ error, onRetry, title, className }: ErrorStateProps) {
  const { t } = useTranslation();
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;

  return (
    <div className={cn("surface flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <AlertTriangle className="h-5 w-5 text-destructive" />
      <div className="max-w-sm">
        <p className="text-sm font-medium">{title ?? t("common.load_error")}</p>
        {message && <p className="mt-1 text-xs text-muted-foreground break-words">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw />
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

interface EmptyPanelProps {
  icon?: React.ElementType;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Generic empty state for lists and panels. */
export function EmptyPanel({ icon: Icon, title, description, action, className }: EmptyPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong px-6 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface">
          <Icon className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} />
        </div>
      )}
      <div className="max-w-sm">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
