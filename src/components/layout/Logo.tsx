import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Show the "RigFlow" wordmark next to the mark */
  withWordmark?: boolean;
  /** Rivet holes on the stem; only readable at ≥ 48 px */
  rivets?: boolean;
  /** Mark size class, default h-6 w-6 */
  markClassName?: string;
}

// Source of truth: assets/brand/rigflow-mark.svg (keep in sync, then run scripts/build-icons.py)
const MARK = "M18 14H64L82 32V48L72 60L86 86H62L51 63H40V86H18Z M40 30H59L64 35V47H40Z";
const RIVETS = "M29 19.6a3.4 3.4 0 1 0 0 6.8a3.4 3.4 0 1 0 0-6.8Z M29 73.6a3.4 3.4 0 1 0 0 6.8a3.4 3.4 0 1 0 0-6.8Z";

/** RigFlow mark: an "R" shaped like a flight-case corner plate. */
export function Logo({ className, withWordmark = true, rivets = false, markClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg viewBox="12 10 80 80" className={cn("h-6 w-6 shrink-0", markClassName)} aria-hidden="true">
        <path className="fill-primary" fillRule="evenodd" d={rivets ? `${MARK} ${RIVETS}` : MARK} />
      </svg>
      {withWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">RigFlow</span>
      )}
    </span>
  );
}
