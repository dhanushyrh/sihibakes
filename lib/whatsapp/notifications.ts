import { BRAND } from "@/lib/constants";
import type { Order, OrderStatus } from "@/lib/types";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { hasSentMessage, sendWhatsAppTemplate } from "@/lib/whatsapp/client";
import {
  buildCheckoutOtpComponents,
  buildOrderCancelledComponents,
  buildOrderConfirmedComponents,
  buildOrderDispatchComponents,
  buildOrderStatusComponents,
  resolveTemplateComponents,
} from "@/lib/whatsapp/template-components";

export async function sendCheckoutOtp(phone: string, code: string) {
  const config = getWhatsAppConfig();
  const templateName = config?.templates.otp ?? "checkout_otp";

  return sendWhatsAppTemplate({
    phone,
    messageType: "checkout_otp",
    templateName,
    components: buildCheckoutOtpComponents(code),
    languageCode: config?.otpLanguageCode ?? "en",
  });
}

/** Order placed (payment success) — uses approved Sihi utility template. */
export async function sendOrderPlacedNotification(order: Order) {
  if (await hasSentMessage(order.id, "order_placed")) {
    return { ok: true, messageId: null, error: null };
  }

  const config = getWhatsAppConfig();
  const templateName = config?.templates.orderPlaced ?? "order_confirmed";
  const resolved = resolveTemplateComponents(templateName, { order });
  if (!resolved) {
    const error = `Could not build template parameters for "${templateName}"`;
    console.error(`WhatsApp order placed notification failed for ${order.order_number}:`, error);
    return { ok: false, messageId: null, error };
  }

  const result = await sendWhatsAppTemplate({
    phone: order.phone,
    messageType: "order_placed",
    templateName,
    components: resolved.components,
    orderId: order.id,
    languageCode: resolved.languageCode,
  });

  if (!result.ok) {
    console.error(
      `WhatsApp order placed notification failed for ${order.order_number}:`,
      result.error
    );
  }

  return result;
}

export async function sendOrderConfirmedNotification(order: Order) {
  if (await hasSentMessage(order.id, "order_confirmed")) return;
  // Payment success already sends order_confirmed template as order_placed.
  if (await hasSentMessage(order.id, "order_placed")) return;

  const config = getWhatsAppConfig();
  const templateName = config?.templates.orderConfirmed ?? "order_confirmed";

  return sendWhatsAppTemplate({
    phone: order.phone,
    messageType: "order_confirmed",
    templateName,
    components: buildOrderConfirmedComponents(order),
    orderId: order.id,
    languageCode: config?.languageCode ?? "en_US",
  });
}

export async function sendOrderStatusNotification(
  order: Order,
  newStatus: OrderStatus,
  extras?: { estimatedArrival?: string }
) {
  const config = getWhatsAppConfig();
  const languageCode = config?.languageCode ?? "en_US";

  if (newStatus === "confirmed") {
    return sendOrderConfirmedNotification(order);
  }

  if (newStatus === "out_for_delivery") {
    const templateName =
      config?.templates.orderDispatch ?? "order_out_for_delivery_v2";

    return sendWhatsAppTemplate({
      phone: order.phone,
      messageType: "order_out_for_delivery",
      templateName,
      components: buildOrderDispatchComponents(order, extras),
      orderId: order.id,
      languageCode,
    });
  }

  if (newStatus === "cancelled") {
    const templateName = config?.templates.orderCancelled ?? "order_cancelled";

    return sendWhatsAppTemplate({
      phone: order.phone,
      messageType: "order_cancelled",
      templateName,
      components: buildOrderCancelledComponents(order),
      orderId: order.id,
      languageCode,
    });
  }

  if (newStatus === "preparing" || newStatus === "delivered" || newStatus === "self_delivered") {
    const templateName = config?.templates.orderStatus ?? "order_status_update";

    return sendWhatsAppTemplate({
      phone: order.phone,
      messageType: `order_status_${newStatus}`,
      templateName,
      components: buildOrderStatusComponents(order, newStatus),
      orderId: order.id,
      languageCode,
    });
  }
}

export async function notifyOrderStatusChange(
  orderId: string,
  newStatus: OrderStatus,
  extras?: { estimatedArrival?: string }
) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) return;

  try {
    await sendOrderStatusNotification(order as Order, newStatus, extras);
  } catch (err) {
    console.error(`WhatsApp status notification failed (${newStatus}):`, err);
  }
}

export async function notifyOrderPlaced(orderId: string) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) {
    console.error("WhatsApp order placed notification skipped — order not found:", orderId);
    return { ok: false, messageId: null, error: "Order not found" };
  }

  return sendOrderPlacedNotification(order as Order);
}

export async function notifyOrderConfirmed(orderId: string) {
  return notifyOrderPlaced(orderId);
}

export function getWhatsAppSetupHint(): string {
  return `Configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID. Create approved templates in Meta Business Manager for ${BRAND.name}.`;
}
