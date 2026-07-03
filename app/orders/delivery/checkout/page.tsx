import {
  getAvailableDeliverySlots,
  getProductsByIds,
  getShopSettings,
  getStorefrontStatus,
} from "@/lib/data";
import { getActivePublicCoupons } from "@/lib/public-coupons";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryCheckoutClient } from "@/components/orders/DeliveryCheckoutClient";
import { DEFAULT_KITCHEN } from "@/lib/constants";
import { getDeliveryFence } from "@/lib/delivery-fence";
import { isPaymentSkipEnabled } from "@/lib/payment-skip";
import {
  readCartIdsFromCookies,
  readDeliveryScheduleFromCookies,
} from "@/lib/delivery-session-server";

export default async function DeliveryCheckoutPage() {
  const [slots, storefront, settings, coupons, cartIds, schedule] =
    await Promise.all([
      getAvailableDeliverySlots(),
      getStorefrontStatus(),
      getShopSettings(),
      getActivePublicCoupons(),
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
      <DeliveryCheckoutClient
        initialSlots={slots}
        initialCoupons={coupons}
        initialProducts={initialProducts}
        ssrDeliveryDate={schedule.deliveryDate}
        ssrDeliveryMode={schedule.deliveryMode}
        storeOpen={storefront.isOpen}
        kitchenLat={settings?.kitchen_lat ?? DEFAULT_KITCHEN.lat}
        kitchenLng={settings?.kitchen_lng ?? DEFAULT_KITCHEN.lng}
        deliveryFence={getDeliveryFence(settings)}
        paymentSkipEnabled={isPaymentSkipEnabled(settings)}
      />
    </div>
  );
}
