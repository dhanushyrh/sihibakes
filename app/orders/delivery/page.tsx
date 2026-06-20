import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryLocationClient } from "@/components/orders/DeliveryLocationClient";
import { getShopSettings } from "@/lib/data";
import { DEFAULT_KITCHEN } from "@/lib/constants";
import { getDeliveryFence } from "@/lib/delivery-fence";

export default async function DeliveryLocationPage() {
  const settings = await getShopSettings();

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner />
      <DeliveryLocationClient
        kitchenLat={settings?.kitchen_lat ?? DEFAULT_KITCHEN.lat}
        kitchenLng={settings?.kitchen_lng ?? DEFAULT_KITCHEN.lng}
        deliveryFence={getDeliveryFence(settings)}
      />
    </div>
  );
}
