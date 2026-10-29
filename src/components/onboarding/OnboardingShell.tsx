import { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";

interface OnboardingShellProps {
  children: ReactNode;
  /** Right side of the top bar */
  actions?: ReactNode;
}

/** Minimal full-page frame for post-login setup screens (install, permissions). */
export function OnboardingShell({ children, actions }: OnboardingShellProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-5 pb-safe pt-safe sm:px-8">
      <div className="mx-auto flex h-16 w-full max-w-lg items-center justify-between">
        <Logo />
        {actions}
      </div>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-8">{children}</main>
    </div>
  );
}

/** Page title block for onboarding screens. */
export function OnboardingHeading({ eyebrow, title, description }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl">{title}</h1>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}

interface InfoListItem {
  icon: React.ElementType;
  title: ReactNode;
  desc?: ReactNode;
}

/** Bordered list of icon + text rows. */
export function InfoList({ items, className }: { items: InfoListItem[]; className?: string }) {
  return (
    <ul className={`surface divide-y divide-border ${className ?? ""}`}>
      {items.map(({ icon: Icon, title, desc }, i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="text-sm font-medium">{title}</p>
            {desc && <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{desc}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
