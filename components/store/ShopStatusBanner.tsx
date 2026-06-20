import { getStorefrontStatus } from "@/lib/data";
import { OrdersPausedBanner } from "@/components/store/StoreFooter";

export async function ShopStatusBanner() {
  const { isOpen, bannerMessage } = await getStorefrontStatus();

  if (!bannerMessage) return null;

  return (
    <OrdersPausedBanner
      accepting={false}
      message={bannerMessage}
      storeClosed={!isOpen || bannerMessage.toLowerCase().includes("store closed")}
    />
  );
}
