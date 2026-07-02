import { getShopSettings } from "@/lib/data";
import type { ShopSettings } from "@/lib/types";

export function isPaymentSkipEnabled(
  settings: ShopSettings | null | undefined
): boolean {
  return settings?.payment_skip_enabled ?? false;
}

export async function getPaymentSkipEnabled(): Promise<boolean> {
  const settings = await getShopSettings();
  return isPaymentSkipEnabled(settings);
}
