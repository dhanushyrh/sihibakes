import { Skeleton } from "@/components/ui/Skeleton";

type StorePageSkeletonProps = {
  variant?: "hub" | "menu" | "cart" | "checkout" | "legal" | "order";
};

function FlowHeaderSkeleton() {
  return (
    <div className="border-b border-chocolate/10 bg-cream px-4 py-3">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  );
}

function CartLineSkeleton() {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-chocolate/10">
      <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="mt-auto flex justify-between">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

export function CartLinesSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy aria-label="Loading cart">
      {Array.from({ length: count }).map((_, i) => (
        <CartLineSkeleton key={i} />
      ))}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-chocolate/10">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-2 h-9 w-full rounded-full" />
      </div>
    </div>
  );
}

export function StorePageSkeleton({ variant = "hub" }: StorePageSkeletonProps) {
  if (variant === "hub") {
    return (
      <div className="min-h-screen bg-cream" aria-busy aria-label="Loading page">
        <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
          <Skeleton className="mx-auto h-20 w-20 rounded-full" />
          <Skeleton className="mx-auto h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "menu") {
    return (
      <div className="min-h-screen bg-cream" aria-busy aria-label="Loading menu">
        <FlowHeaderSkeleton />
        <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "cart") {
    return (
      <div className="min-h-screen bg-cream" aria-busy aria-label="Loading cart">
        <FlowHeaderSkeleton />
        <div className="mx-auto max-w-lg space-y-3 px-4 py-4">
          <CartLineSkeleton />
          <CartLineSkeleton />
          <Skeleton className="mt-4 h-32 rounded-2xl" />
          <Skeleton className="mt-5 h-12 rounded-full" />
        </div>
      </div>
    );
  }

  if (variant === "checkout") {
    return (
      <div className="min-h-screen bg-cream" aria-busy aria-label="Loading checkout">
        <FlowHeaderSkeleton />
        <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-12 rounded-full" />
        </div>
      </div>
    );
  }

  if (variant === "legal") {
    return (
      <div className="min-h-screen bg-cream" aria-busy aria-label="Loading document">
        <FlowHeaderSkeleton />
        <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream" aria-busy aria-label="Loading order">
      <FlowHeaderSkeleton />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8 text-center">
        <Skeleton className="mx-auto h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto h-7 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
        <Skeleton className="mt-6 h-40 rounded-2xl" />
      </div>
    </div>
  );
}
