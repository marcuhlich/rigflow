import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Small note rendered below the panel */
  footer?: ReactNode;
  tone?: "default" | "danger";
  children: ReactNode;
  className?: string;
}

/** A titled group of settings rows inside one bordered panel. */
export function SettingsSection({ title, description, footer, tone = "default", children, className }: SectionProps) {
  return (
    <section className={cn("space-y-2.5", className)}>
      {(title || description) && (
        <div className="px-0.5">
          {title && (
            <h2 className={cn("text-sm font-semibold", tone === "danger" ? "text-destructive" : "text-foreground")}>
              {title}
            </h2>
          )}
          {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
        </div>
      )}
      <div
        className={cn(
          "surface divide-y divide-border overflow-hidden",
          tone === "danger" && "border-destructive/40"
        )}
      >
        {children}
      </div>
      {footer && <p className="px-0.5 text-xs leading-relaxed text-muted-foreground">{footer}</p>}
    </section>
  );
}

interface RowProps {
  label: ReactNode;
  description?: ReactNode;
  /** Control rendered on the right (switch, button, value …) */
  control?: ReactNode;
  /** Stack the control below the label on small screens (for wide controls) */
  stack?: boolean;
  /** id of the control, links the label for switches */
  htmlFor?: string;
  disabled?: boolean;
  /** Extra content rendered full-width under the row (expanded editors etc.) */
  children?: ReactNode;
  className?: string;
}

/** Label + description on the left, control on the right. */
export function SettingsRow({ label, description, control, stack, htmlFor, disabled, children, className }: RowProps) {
  const LabelTag = htmlFor ? "label" : "div";
  return (
    <div className={cn("px-4 py-3.5", disabled && "opacity-60", className)}>
      <div
        className={cn(
          "flex gap-4",
          stack ? "flex-col sm:flex-row sm:items-center sm:justify-between" : "items-center justify-between"
        )}
      >
        <div className="min-w-0 flex-1">
          <LabelTag
            {...(htmlFor ? { htmlFor } : {})}
            className={cn("block text-sm font-medium text-foreground", htmlFor && !disabled && "cursor-pointer")}
          >
            {label}
          </LabelTag>
          {description && (
            <div className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{description}</div>
          )}
        </div>
        {control && <div className={cn("shrink-0", stack && "w-full sm:w-auto")}>{control}</div>}
      </div>
      {children}
    </div>
  );
}

interface LinkRowProps {
  to: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: React.ElementType;
  trailing?: ReactNode;
  state?: unknown;
}

/** Full-width navigational row. */
export function SettingsLinkRow({ to, label, description, icon: Icon, trailing, state }: LinkRowProps) {
  return (
    <Link
      to={to}
      state={state}
      className="flex min-h-12 items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50 active:bg-muted"
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {description && <span className="block text-[13px] text-muted-foreground">{description}</span>}
      </span>
      {trailing}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** Wrapper for a settings sub page: vertical rhythm between sections. */
export function SettingsPage({ children }: { children: ReactNode }) {
  return <div className="space-y-8 pb-4">{children}</div>;
}
