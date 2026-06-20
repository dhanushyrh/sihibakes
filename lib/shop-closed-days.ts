import { createAdminClient } from "@/lib/supabase/admin";
import {
  countBlockingOrdersForDeliveryDate,
  formatBlockingOrdersError,
} from "@/lib/orders";

export function normalizeDateKey(date: string): string {
  return date.slice(0, 10);
}

export function normalizeClosedDates(dates: unknown): string[] {
  if (!Array.isArray(dates)) return [];
  return [...new Set(dates.map((d) => normalizeDateKey(String(d))))].sort();
}

export async function closeDeliveryDay(date: string): Promise<void> {
  const day = normalizeDateKey(date);
  const blockingCount = await countBlockingOrdersForDeliveryDate(day);
  if (blockingCount > 0) {
    throw new Error(formatBlockingOrdersError(blockingCount));
  }

  const admin = createAdminClient();

  const { error: slotError } = await admin
    .from("delivery_slots")
    .update({ is_active: false })
    .eq("slot_date", day);

  if (slotError) {
    throw new Error(slotError.message);
  }

  const { data: settings } = await admin
    .from("shop_settings")
    .select("id, closed_dates")
    .limit(1)
    .single();

  if (!settings) {
    throw new Error("Shop settings not found");
  }

  const closedDates = normalizeClosedDates([
    ...(settings.closed_dates as string[]),
    day,
  ]);

  const { error: settingsError } = await admin
    .from("shop_settings")
    .update({
      closed_dates: closedDates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", settings.id);

  if (settingsError) {
    throw new Error(settingsError.message);
  }
}

export async function openDeliveryDay(date: string): Promise<void> {
  const day = normalizeDateKey(date);
  const admin = createAdminClient();

  const { error: slotError } = await admin
    .from("delivery_slots")
    .update({ is_active: true })
    .eq("slot_date", day);

  if (slotError) {
    throw new Error(slotError.message);
  }

  const { data: settings } = await admin
    .from("shop_settings")
    .select("id, closed_dates")
    .limit(1)
    .single();

  if (!settings) {
    throw new Error("Shop settings not found");
  }

  const closedDates = normalizeClosedDates(
    (settings.closed_dates as string[]).filter(
      (d) => normalizeDateKey(d) !== day
    )
  );

  const { error: settingsError } = await admin
    .from("shop_settings")
    .update({
      closed_dates: closedDates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", settings.id);

  if (settingsError) {
    throw new Error(settingsError.message);
  }
}
