import { Suspense } from "react";
import { getStorefrontStatus } from "@/lib/data";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryCartClient } from "@/components/orders/DeliveryCartClient";
import { StorePageSkeleton } from "@/components/store/StorePageSkeleton";

export default async function DeliveryCartPage() {
  const storefront = await getStorefrontStatus();

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner />
      <Suspense fallback={<StorePageSkeleton variant="cart" />}>
        <DeliveryCartClient storeOpen={storefront.isOpen} />
      </Suspense>
    </div>
  );
}
