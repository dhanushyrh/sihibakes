import { Skeleton } from "@/components/admin/ui/Skeleton";

export function DashboardStatsSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3" aria-busy aria-label="Loading stats">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

export function DashboardInsightsSkeleton() {
  return <Skeleton className="mt-6 h-40 rounded-2xl" aria-busy aria-label="Loading insights" />;
}

export function DashboardProductsSkeleton() {
  return (
    <section className="mt-8" aria-busy aria-label="Loading products">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-2 h-4 w-56" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[16/10] rounded-2xl" />
        ))}
      </div>
    </section>
  );
}
