import { Skeleton } from "@/components/admin/ui/Skeleton";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
};

export function TableSkeleton({
  rows = 8,
  columns = 5,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10"
      aria-busy
      aria-label="Loading table"
    >
      {showHeader && (
        <div className="flex gap-4 border-b border-[#4B2C20]/10 px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`h-${i}`} className="h-4 flex-1" />
          ))}
        </div>
      )}
      <div className="divide-y divide-[#4B2C20]/5">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton
                key={`${row}-${col}`}
                className={`h-4 flex-1 ${col === 0 ? "max-w-[120px]" : ""}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
