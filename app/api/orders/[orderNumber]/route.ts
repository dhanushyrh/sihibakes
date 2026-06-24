import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/storefront";
import { getCustomerWhatsAppStatus } from "@/lib/whatsapp/customer-messages";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Phone required" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);
  const admin = createAdminClient();

  const [{ data: order }, { data: settings }] = await Promise.all([
    admin
      .from("orders")
      .select("*, order_items(*, products(*))")
      .eq("order_number", orderNumber)
      .eq("phone", normalizedPhone)
      .single(),
    admin.from("shop_settings").select("phone").limit(1).single(),
  ]);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: whatsappLog } = await admin
    .from("whatsapp_message_log")
    .select("status")
    .eq("order_id", order.id)
    .eq("message_type", "order_placed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const customerWhatsAppStatus = getCustomerWhatsAppStatus(whatsappLog);

  return NextResponse.json({
    ...order,
    shop_phone: settings?.phone ?? null,
    whatsapp_notification: customerWhatsAppStatus
      ? { status: customerWhatsAppStatus }
      : null,
  });
}
