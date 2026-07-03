import type { DeliveryMode } from "@/lib/customer-delivery-slots";

export const DELIVERY_MODE_COOKIE = "sihi-delivery-mode";
export const DELIVERY_DATE_COOKIE = "sihi-delivery-date";
export const CART_IDS_COOKIE = "sihi-cart-ids";

const SCHEDULE_MAX_AGE = 60 * 60 * 24 * 30;
const CART_MAX_AGE = 60 * 60 * 24 * 7;

export function syncDeliveryScheduleCookies(
  mode: DeliveryMode | null,
  date: string
) {
  if (typeof document === "undefined") return;
  if (mode && date) {
    document.cookie = `${DELIVERY_MODE_COOKIE}=${encodeURIComponent(mode)}; path=/; max-age=${SCHEDULE_MAX_AGE}; SameSite=Lax`;
    document.cookie = `${DELIVERY_DATE_COOKIE}=${encodeURIComponent(date)}; path=/; max-age=${SCHEDULE_MAX_AGE}; SameSite=Lax`;
  } else {
    document.cookie = `${DELIVERY_MODE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${DELIVERY_DATE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function syncCartIdsCookie(productIds: string[]) {
  if (typeof document === "undefined") return;
  if (productIds.length === 0) {
    document.cookie = `${CART_IDS_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${CART_IDS_COOKIE}=${encodeURIComponent(productIds.join(","))}; path=/; max-age=${CART_MAX_AGE}; SameSite=Lax`;
}
