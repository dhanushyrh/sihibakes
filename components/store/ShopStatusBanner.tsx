import { getStorefrontStatus, type StorefrontStatus } from "@/lib/data";
import { OrdersPausedBanner } from "@/components/store/StoreFooter";

export function ShopStatusBannerView({
  isOpen,
  bannerMessage,
}: StorefrontStatus) {
  if (!bannerMessage) return null;

  return (
    <OrdersPausedBanner
      accepting={false}
      message={bannerMessage}
      storeClosed={!isOpen || bannerMessage.toLowerCase().includes("store closed")}
    />
  );
}

export async function ShopStatusBanner() {
  const status = await getStorefrontStatus();
  return <ShopStatusBannerView {...status} />;
}
