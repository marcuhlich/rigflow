import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: ReactNode;
  description?: ReactNode;
  /** Kept for backwards compatibility; icons are no longer rendered in page titles. */
  icon?: LucideIcon;
  /** Small line above the title, e.g. a breadcrumb or back link */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className }: Props) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[13px] text-muted-foreground">{eyebrow}</div>}
        <h1 className="truncate text-xl font-semibold tracking-tight sm:text-[22px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
