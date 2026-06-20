import {
  getAvailableDeliverySlots,
  getStorefrontStatus,
} from "@/lib/data";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryCheckoutClient } from "@/components/orders/DeliveryCheckoutClient";

export default async function DeliveryCheckoutPage() {
  const [slots, storefront] = await Promise.all([
    getAvailableDeliverySlots(),
    getStorefrontStatus(),
  ]);

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner />
      <DeliveryCheckoutClient
        initialSlots={slots}
        storeOpen={storefront.isOpen}
      />
    </div>
  );
}
