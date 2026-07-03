import { ProductGridSkeleton } from "@/components/admin/ui/AdminPageSkeleton";

export default function AdminProductsLoading() {
  return (
    <div className="space-y-6" aria-busy aria-label="Loading products">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-[#4B2C20]/10" />
      <ProductGridSkeleton count={6} />
    </div>
  );
}
