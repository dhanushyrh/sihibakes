import { TableSkeleton } from "@/components/admin/ui/TableSkeleton";

export default function AdminCustomersLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading customers">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[#4B2C20]/10" />
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}
