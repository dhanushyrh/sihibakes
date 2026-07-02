import {
  getAvailableDeliverySlots,
  getShopSettings,
  getStorefrontStatus,
} from "@/lib/data";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryCheckoutClient } from "@/components/orders/DeliveryCheckoutClient";
import { DEFAULT_KITCHEN } from "@/lib/constants";
import { getDeliveryFence } from "@/lib/delivery-fence";
import { isPaymentSkipEnabled } from "@/lib/payment-skip";
export default async function DeliveryCheckoutPage() {
  const [slots, storefront, settings] = await Promise.all([
    getAvailableDeliverySlots(),
    getStorefrontStatus(),
    getShopSettings(),
  ]);

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner />
      <DeliveryCheckoutClient
        initialSlots={slots}
        storeOpen={storefront.isOpen}
        kitchenLat={settings?.kitchen_lat ?? DEFAULT_KITCHEN.lat}
        kitchenLng={settings?.kitchen_lng ?? DEFAULT_KITCHEN.lng}
        deliveryFence={getDeliveryFence(settings)}
        paymentSkipEnabled={isPaymentSkipEnabled(settings)}
      />
    </div>
  );
}
