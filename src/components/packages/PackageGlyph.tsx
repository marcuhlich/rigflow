import { cn } from "@/lib/utils";
import { getPackageIcon } from "./packageIcons";

/** Neutral bordered tile with the package icon; the package colour tints only the glyph. */
export function PackageGlyph({ icon, color, className }: {
  icon: string | null | undefined;
  color: string | null | undefined;
  className?: string;
}) {
  const Icon = getPackageIcon(icon);
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-sunken",
        className,
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} style={{ color: color ?? undefined }} />
    </span>
  );
}
