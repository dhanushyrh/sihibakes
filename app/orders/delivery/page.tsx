import { ShopStatusBanner } from "@/components/store/ShopStatusBanner";
import { DeliveryModeChoiceClient } from "@/components/orders/DeliveryModeChoiceClient";
import { getDeliveryModeAvailability } from "@/lib/data";

export default async function DeliveryModePage() {
  const availability = await getDeliveryModeAvailability();

  return (
    <div className="min-h-screen bg-cream">
      <ShopStatusBanner />
      <DeliveryModeChoiceClient availability={availability} />
    </div>
  );
}
