import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ProductFrameProps {
  /** Label in the frame's title bar, e.g. a view name */
  title?: ReactNode;
  /** Right side of the title bar */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Mocks are decorative by default; set false for interactive demos. */
  decorative?: boolean;
}

/** Bordered "screenshot" frame for stylised product mocks. Flat: no tilt, no glow. */
export function ProductFrame({
  title,
  actions,
  children,
  className,
  bodyClassName,
  decorative = true,
}: ProductFrameProps) {
  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}
      aria-hidden={decorative || undefined}
    >
      {(title || actions) && (
        <div className="flex h-10 items-center justify-between gap-3 border-b border-border bg-surface-sunken px-3">
          <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium">{title}</div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/** A static, non-interactive input look-alike used inside mocks. */
export function MockField({ label, value, muted }: { label?: ReactNode; value: ReactNode; muted?: boolean }) {
  return (
    <div className="space-y-1">
      {label && <div className="text-xs text-muted-foreground">{label}</div>}
      <div
        className={cn(
          "flex h-8 items-center justify-between rounded-md border border-input bg-background px-2.5 text-xs",
          muted && "text-muted-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}
