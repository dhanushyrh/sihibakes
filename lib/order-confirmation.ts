import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/storefront";
import { getCustomerWhatsAppStatus } from "@/lib/whatsapp/customer-messages";
import type { Order, OrderItem } from "@/lib/types";

export type OrderConfirmationData = Order & {
  order_items?: OrderItem[];
  shop_phone?: string | null;
  whatsapp_notification?: {
    status: ReturnType<typeof getCustomerWhatsAppStatus>;
  } | null;
};

export async function getOrderForConfirmation(
  orderNumber: string,
  phone: string
): Promise<OrderConfirmationData | null> {
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

  if (!order) return null;

  const { data: whatsappLog } = await admin
    .from("whatsapp_message_log")
    .select("status")
    .eq("order_id", order.id)
    .eq("message_type", "order_placed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const customerWhatsAppStatus = getCustomerWhatsAppStatus(whatsappLog);

  return {
    ...order,
    shop_phone: settings?.phone ?? null,
    whatsapp_notification: customerWhatsAppStatus
      ? { status: customerWhatsAppStatus }
      : null,
  } as OrderConfirmationData;
}
