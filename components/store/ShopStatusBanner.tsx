import type { StorefrontStatus } from "@/lib/data";
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

export function ShopStatusBanner({ status }: { status: StorefrontStatus }) {
  return <ShopStatusBannerView {...status} />;
}
