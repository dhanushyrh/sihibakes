import { ListSkeleton } from "@/components/admin/ui/AdminPageSkeleton";

export default function KitchenLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-32 rounded bg-[#4B2C20]/10" />
        <div className="mt-2 h-4 w-64 rounded bg-[#4B2C20]/10" />
      </div>
      <ListSkeleton count={4} />
    </div>
  );
}
