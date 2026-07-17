import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/mock-data";
import { PRE_ORDER_SCAN_DAYS } from "@/lib/constants";
import { shopDatePlusDays } from "@/lib/shop-timezone";
import type { DeliverySlot, Product } from "@/lib/types";
import { CreateOfflineOrderForm } from "@/components/admin/orders/CreateOfflineOrderForm";

export const dynamic = "force-dynamic";

/** How far back to load existing slots for offline create (past dates). */
const OFFLINE_SLOT_LOOKBACK_DAYS = 90;

export default async function CreateOfflineOrderPage() {
  let products: Product[] = [];
  let slots: DeliverySlot[] = [];

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const minDate = shopDatePlusDays(-OFFLINE_SLOT_LOOKBACK_DAYS);
    const maxDate = shopDatePlusDays(PRE_ORDER_SCAN_DAYS - 1);

    const [{ data: productRows }, { data: slotRows }] = await Promise.all([
      admin
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("title", { ascending: true }),
      admin
        .from("delivery_slots")
        .select("*")
        .eq("is_active", true)
        .gte("slot_date", minDate)
        .lte("slot_date", maxDate)
        .order("slot_date")
        .order("window_start"),
    ]);

    products = (productRows ?? []) as Product[];
    slots = (slotRows ?? []) as DeliverySlot[];
  }

  return <CreateOfflineOrderForm products={products} slots={slots} />;
}
