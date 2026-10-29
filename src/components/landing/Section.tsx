import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  id?: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Sunken background band with hairline borders */
  sunken?: boolean;
  /** Center the heading block */
  centered?: boolean;
}

/** Consistent vertical rhythm and heading block for marketing sections. */
export function Section({ id, eyebrow, title, description, children, className, sunken, centered }: SectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-16", sunken && "border-y border-border bg-surface-sunken", className)}>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        {(eyebrow || title || description) && (
          <div className={cn("mb-10 max-w-2xl", centered && "mx-auto text-center")}>
            {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
            {title && <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h2>}
            {description && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

interface SplitProps {
  text: ReactNode;
  visual: ReactNode;
  /** Put the visual on the left on desktop */
  reverse?: boolean;
}

/** Two-column text + visual row. Stacks text-first on mobile. */
export function Split({ text, visual, reverse }: SplitProps) {
  return (
    <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-14">
      <div className={cn(reverse && "md:order-2")}>{text}</div>
      <div className={cn(reverse && "md:order-1")}>{visual}</div>
    </div>
  );
}

interface SplitTextProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
}

export function SplitText({ eyebrow, title, description, children }: SplitTextProps) {
  return (
    <div>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
