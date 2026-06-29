import { WHATSAPP_SERVICE_WINDOW_HOURS } from "@/lib/constants";

export function isWithinCustomerServiceWindow(
  lastCustomerMessageAt: string | null | undefined
): boolean {
  if (!lastCustomerMessageAt) return false;
  const last = new Date(lastCustomerMessageAt).getTime();
  if (Number.isNaN(last)) return false;
  const windowMs = WHATSAPP_SERVICE_WINDOW_HOURS * 60 * 60 * 1000;
  return Date.now() - last <= windowMs;
}

export function customerServiceWindowExpiresAt(
  lastCustomerMessageAt: string | null | undefined
): Date | null {
  if (!lastCustomerMessageAt) return null;
  const last = new Date(lastCustomerMessageAt);
  if (Number.isNaN(last.getTime())) return null;
  return new Date(
    last.getTime() + WHATSAPP_SERVICE_WINDOW_HOURS * 60 * 60 * 1000
  );
}
