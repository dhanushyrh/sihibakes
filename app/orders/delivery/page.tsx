import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryModeChoiceClient } from "@/components/orders/DeliveryModeChoiceClient";
import { getDeliveryModeAvailability, getStorefrontStatus } from "@/lib/data";

export const revalidate = 60;

export default async function DeliveryModePage() {
  const [availability, storefront] = await Promise.all([
    getDeliveryModeAvailability(),
    getStorefrontStatus(),
  ]);

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner status={storefront} />
      <DeliveryModeChoiceClient availability={availability} />
    </div>
  );
}
