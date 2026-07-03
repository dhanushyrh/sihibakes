import {
  getShopSettings,
  getStorefrontStatus,
} from "@/lib/data";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryCheckoutLocationClient } from "@/components/orders/DeliveryCheckoutLocationClient";
import { DEFAULT_KITCHEN } from "@/lib/constants";
import { getDeliveryFence } from "@/lib/delivery-fence";

export default async function DeliveryCheckoutLocationPage() {
  const [storefront, settings] = await Promise.all([
    getStorefrontStatus(),
    getShopSettings(),
  ]);

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner status={storefront} />
      <DeliveryCheckoutLocationClient
        storeOpen={storefront.isOpen}
        kitchenLat={settings?.kitchen_lat ?? DEFAULT_KITCHEN.lat}
        kitchenLng={settings?.kitchen_lng ?? DEFAULT_KITCHEN.lng}
        deliveryFence={getDeliveryFence(settings)}
      />
    </div>
  );
}
