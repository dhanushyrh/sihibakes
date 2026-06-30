import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUnreadEnquiryCount } from "@/lib/enquiries";
import { getWhatsAppUnreadTotal } from "@/lib/whatsapp/unread";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();

  const [
    { count: pendingOrders },
    newEnquiries,
    whatsappUnread,
  ] = await Promise.all([
    admin
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("payment_status", "paid"),
    getUnreadEnquiryCount(admin),
    getWhatsAppUnreadTotal(admin),
  ]);

  return NextResponse.json({
    pendingOrders: pendingOrders ?? 0,
    whatsappUnread,
    newEnquiries,
  });
}
