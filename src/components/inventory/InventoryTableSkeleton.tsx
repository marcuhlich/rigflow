import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder shaped like the inventory table. */
export function InventoryTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="surface overflow-hidden" aria-busy="true">
      <div className="flex h-9 items-center gap-6 border-b border-border bg-surface-sunken px-3">
        <Skeleton className="h-3 w-4" />
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="ml-auto h-2.5 w-12" />
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-2.5 w-10" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex h-11 items-center gap-3 px-3">
            <Skeleton className="h-4 w-4 rounded-sm" />
            <Skeleton className="h-7 w-7" />
            <Skeleton className="h-3.5" style={{ width: `${18 + ((i * 7) % 14)}%` }} />
            <Skeleton className="ml-auto h-3 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
