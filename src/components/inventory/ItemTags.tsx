import { cn } from "@/lib/utils";

interface ItemTagsProps {
  tags?: string[] | null;
  max?: number;
  className?: string;
}

/** Compact, neutral tag chips with a "+N" overflow counter. */
export function ItemTags({ tags, max = 3, className }: ItemTagsProps) {
  const list = (tags ?? []).filter(Boolean);
  if (list.length === 0) return null;
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      {shown.map((tag) => (
        <span
          key={tag}
          className="max-w-[96px] truncate rounded-[4px] border border-border px-1.5 text-2xs leading-4 text-muted-foreground"
        >
          {tag}
        </span>
      ))}
      {rest > 0 && <span className="font-mono text-2xs text-muted-foreground">+{rest}</span>}
    </div>
  );
}
