import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUnreadEnquiryCount } from "@/lib/enquiries";
import { shopDateKey } from "@/lib/shop-timezone";
import { getWhatsAppUnreadTotal } from "@/lib/whatsapp/unread";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const today = shopDateKey();

  const [
    { count: pendingOrders },
    { count: kitchenActiveToday },
    newEnquiries,
    whatsappUnread,
  ] = await Promise.all([
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("payment_status", "paid"),
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .eq("delivery_date", today)
      .in("status", ["pending", "confirmed", "preparing"]),
    getUnreadEnquiryCount(admin),
    getWhatsAppUnreadTotal(admin),
  ]);

  return NextResponse.json({
    pendingOrders: pendingOrders ?? 0,
    kitchenActiveToday: kitchenActiveToday ?? 0,
    whatsappUnread,
    newEnquiries,
  });
}
