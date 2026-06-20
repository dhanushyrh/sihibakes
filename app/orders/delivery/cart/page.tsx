import { getStorefrontStatus } from "@/lib/data";
import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryCartClient } from "@/components/orders/DeliveryCartClient";

export default async function DeliveryCartPage() {
  const storefront = await getStorefrontStatus();

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner />
      <DeliveryCartClient storeOpen={storefront.isOpen} />
    </div>
  );
}
