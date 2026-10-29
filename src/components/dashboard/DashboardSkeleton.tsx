import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/QueryState";

/** Mirrors the dashboard layout while inventory loads. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={i === 0 ? "col-span-2 bg-card px-4 py-3.5 sm:col-span-1" : "bg-card px-4 py-3.5"}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2.5 h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ListSkeleton rows={4} className="lg:col-span-2" />
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}
