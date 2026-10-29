import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardPanelProps {
  title: ReactNode;
  /** Small count shown next to the title (mono). */
  count?: number;
  /** Optional "view all" link in the header. */
  link?: { to: string; label: string };
  /** Extra header controls (right side). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Bordered panel with a compact header row, used for every dashboard section. */
export function DashboardPanel({ title, count, link, actions, children, className }: DashboardPanelProps) {
  return (
    <section className={cn("surface flex min-w-0 flex-col overflow-hidden", className)}>
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
        <h2 className="truncate text-[13px] font-semibold">{title}</h2>
        {count !== undefined && (
          <span className="font-mono text-[12px] tabular-nums text-muted-foreground">{count}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {link && (
            <Link
              to={link.to}
              className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </header>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

/** Muted single-line message for an empty panel body. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">{children}</p>;
}
