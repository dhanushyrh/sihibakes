import { cookies } from "next/headers";
import type { DeliveryMode } from "@/lib/customer-delivery-slots";
import {
  CART_IDS_COOKIE,
  DELIVERY_DATE_COOKIE,
  DELIVERY_MODE_COOKIE,
} from "@/lib/delivery-session-cookies";

export type DeliveryScheduleFromCookies = {
  deliveryMode: DeliveryMode | null;
  deliveryDate: string | null;
};

export async function readDeliveryScheduleFromCookies(): Promise<DeliveryScheduleFromCookies> {
  const jar = await cookies();
  const modeRaw = jar.get(DELIVERY_MODE_COOKIE)?.value;
  const dateRaw = jar.get(DELIVERY_DATE_COOKIE)?.value;

  const deliveryMode =
    modeRaw === "same_day" || modeRaw === "pre_order" ? modeRaw : null;
  const deliveryDate = dateRaw ? decodeURIComponent(dateRaw) : null;

  return { deliveryMode, deliveryDate };
}

export async function readCartIdsFromCookies(): Promise<string[]> {
  const jar = await cookies();
  const raw = jar.get(CART_IDS_COOKIE)?.value;
  if (!raw) return [];
  return decodeURIComponent(raw)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}
