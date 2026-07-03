import { Suspense } from "react";
import { getProductsByIds, getStorefrontStatus } from "@/lib/data";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryCartClient } from "@/components/orders/DeliveryCartClient";
import { StorePageSkeleton } from "@/components/store/StorePageSkeleton";
import {
  readCartIdsFromCookies,
  readDeliveryScheduleFromCookies,
} from "@/lib/delivery-session-server";

export default async function DeliveryCartPage() {
  const [storefront, cartIds, schedule] = await Promise.all([
    getStorefrontStatus(),
    readCartIdsFromCookies(),
    readDeliveryScheduleFromCookies(),
  ]);

  const initialProducts =
    cartIds.length > 0 && schedule.deliveryDate
      ? await getProductsByIds(cartIds, schedule.deliveryDate, {
          deliveryMode: schedule.deliveryMode ?? undefined,
        })
      : [];

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner status={storefront} />
      <Suspense fallback={<StorePageSkeleton variant="cart" />}>
        <DeliveryCartClient
          storeOpen={storefront.isOpen}
          initialProducts={initialProducts}
          ssrDeliveryDate={schedule.deliveryDate}
          ssrDeliveryMode={schedule.deliveryMode}
        />
      </Suspense>
    </div>
  );
}
