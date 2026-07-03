import { TableSkeleton } from "@/components/admin/ui/TableSkeleton";

export default function AdminOrdersLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading orders">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[#4B2C20]/10" />
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}
