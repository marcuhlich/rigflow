import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Show the "RigFlow" wordmark next to the mark */
  withWordmark?: boolean;
}

/** RigFlow mark: a cut-corner tag, like a flight-case label. */
export function Logo({ className, withWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden="true">
        <path d="M4 2h12l4 4v16H4z" className="fill-primary" />
        <path
          d="M8.5 7.5h4.25a2.75 2.75 0 0 1 0 5.5H8.5zm0 5.5v4.5m4.25-4.5 2.75 4.5"
          className="stroke-primary-foreground"
          strokeWidth="1.9"
          fill="none"
          strokeLinecap="square"
        />
      </svg>
      {withWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">RigFlow</span>
      )}
    </span>
  );
}
