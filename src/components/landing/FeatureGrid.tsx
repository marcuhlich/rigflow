import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeatureGridItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeatureGridProps {
  items: FeatureGridItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const COLS = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

/** Hairline-divided grid of features: small line icon, title, short description. */
export function FeatureGrid({ items, columns = 3, className }: FeatureGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border",
        COLS[columns],
        className
      )}
    >
      {items.map(({ icon: Icon, title, description }) => (
        <div key={title} className="bg-card p-5 sm:p-6">
          <Icon className="h-[18px] w-[18px] text-foreground" strokeWidth={1.75} aria-hidden="true" />
          <h3 className="mt-4 text-sm font-semibold">{title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
      ))}
    </div>
  );
}
