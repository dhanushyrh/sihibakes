import type { CustomerCheckoutProfile } from "@/lib/customer-lookup";
import type { DeliveryCalculation } from "@/lib/types";
import { isDeliveryLocationReady, type DeliverySession } from "@/lib/delivery-session";

export const CHECKOUT_DETAILS_PATH = "/orders/delivery/checkout" as const;
export const CHECKOUT_LOCATION_PATH =
  "/orders/delivery/checkout/location" as const;

export type CheckoutPath =
  | typeof CHECKOUT_DETAILS_PATH
  | typeof CHECKOUT_LOCATION_PATH;

export function resolveCheckoutPath(
  session: DeliverySession,
  profile: CustomerCheckoutProfile,
  options?: { prefilledLocationReachable?: boolean }
): CheckoutPath {
  if (isDeliveryLocationReady(session)) {
    return CHECKOUT_DETAILS_PATH;
  }
  if (options?.prefilledLocationReachable) {
    return CHECKOUT_DETAILS_PATH;
  }
  if (
    profile.delivery_lat != null &&
    profile.delivery_lng != null &&
    session.lat != null &&
    session.lng != null &&
    session.delivery?.reachable
  ) {
    return CHECKOUT_DETAILS_PATH;
  }
  return CHECKOUT_LOCATION_PATH;
}

export function isCheckoutLocationReachable(
  lat: number | null,
  lng: number | null,
  delivery: DeliveryCalculation | null
): boolean {
  return lat != null && lng != null && delivery?.reachable === true;
}
