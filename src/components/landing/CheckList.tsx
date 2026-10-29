import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckListItem = string | { label: string; desc?: string };

interface CheckListProps {
  items: CheckListItem[];
  className?: string;
}

/** Plain list with small check marks for feature bullet points. */
export function CheckList({ items, className }: CheckListProps) {
  return (
    <ul className={cn("space-y-2.5", className)}>
      {items.map((item) => {
        const label = typeof item === "string" ? item : item.label;
        const desc = typeof item === "string" ? undefined : item.desc;
        return (
          <li key={label} className="flex gap-2.5 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
            <span>
              <span className="text-foreground">{label}</span>
              {desc && <span className="block text-[13px] text-muted-foreground">{desc}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
