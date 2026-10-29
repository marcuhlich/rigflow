import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "success" | "warning" | "info" | "destructive";

const DOT: Record<StatTone, string> = {
  neutral: "bg-muted-foreground/50",
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  destructive: "bg-destructive",
};

interface StatCardProps {
  title: string;
  value: number | string;
  /** Status colour, shown as a small dot next to the label. */
  tone?: StatTone;
  /** Emphasise the number in the tone colour (e.g. defects > 0). */
  emphasize?: boolean;
  /** Secondary line under the number. */
  hint?: ReactNode;
  /** Makes the whole tile a link. */
  to?: string;
  className?: string;
}

const VALUE_TEXT: Record<StatTone, string> = {
  neutral: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  destructive: "text-destructive",
};

/**
 * KPI tile: small label, large tabular number. Designed to sit in a
 * bordered grid (see dashboard/KpiRow) but works standalone inside `.surface`.
 */
export function StatCard({ title, value, tone = "neutral", emphasize = false, hint, to, className }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[tone])} aria-hidden />
        <span className="truncate">{title}</span>
      </div>
      <div
        className={cn(
          "mt-1.5 font-mono text-2xl font-semibold leading-none tabular-nums tracking-tight sm:text-[28px]",
          emphasize ? VALUE_TEXT[tone] : "text-foreground"
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1.5 truncate text-[12px] text-muted-foreground">{hint}</div>}
    </>
  );

  const base = cn("block min-w-0 px-4 py-3.5", className);

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          base,
          "transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={base}>{body}</div>;
}
