import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeliveryVendor } from "@/lib/types";

export async function listActiveDeliveryVendors(
  supabase: SupabaseClient
): Promise<DeliveryVendor[]> {
  const { data, error } = await supabase
    .from("delivery_vendors")
    .select("id, name, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (error) throw error;
  return (data ?? []) as DeliveryVendor[];
}

export function resolveDeliveryVendorName(
  vendors: DeliveryVendor[],
  value: string
): DeliveryVendor | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return vendors.find((vendor) => vendor.name.toLowerCase() === normalized) ?? null;
}
