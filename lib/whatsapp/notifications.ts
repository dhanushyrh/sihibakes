import { BRAND } from "@/lib/constants";
import type { Order, OrderStatus } from "@/lib/types";
import {
  getUtilityTemplateLanguageCode,
  getWhatsAppConfig,
  isWhatsAppConfigured,
  isWhatsAppNotificationsEnabled,
} from "@/lib/whatsapp/config";
import { hasSentMessage, sendWhatsAppTemplate } from "@/lib/whatsapp/client";
import { getShopSettings } from "@/lib/data";
import { getStorefrontDetails } from "@/lib/storefront";
import {
  buildCheckoutOtpTemplateComponents,
  buildEnquiryReceivedComponents,
  resolveTemplateComponents,
  WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE,
  WHATSAPP_REACH_CONFIRMATION_TEMPLATE,
} from "@/lib/whatsapp/template-components";

export async function sendCheckoutOtp(phone: string, code: string) {
  const config = getWhatsAppConfig();
  const templateName = config?.templates.otp ?? WHATSAPP_REACH_CONFIRMATION_TEMPLATE;
  const settings = await getShopSettings();
  const supportPhone = getStorefrontDetails(settings).phone;

  return sendWhatsAppTemplate({
    phone,
    messageType: "checkout_otp",
    templateName,
    components: buildCheckoutOtpTemplateComponents(
      templateName,
      code,
      supportPhone
    ),
    languageCode: config?.otpLanguageCode ?? "en_US",
  });
}

export async function notifyEnquiryReceived(params: {
  enquiryId: string;
  name: string;
  phone: string;
}) {
  if (!isWhatsAppConfigured()) return;
  if (!(await isWhatsAppNotificationsEnabled())) return;

  const config = getWhatsAppConfig();
  const templateName =
    config?.templates.enquiryReceived ?? WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE;

  const result = await sendWhatsAppTemplate({
    phone: params.phone,
    messageType: "enquiry_received",
    templateName,
    components: buildEnquiryReceivedComponents(
      params.name,
      params.enquiryId.slice(0, 8).toUpperCase()
    ),
    languageCode: getUtilityTemplateLanguageCode(),
  });

  if (!result.ok) {
    console.warn("WhatsApp enquiry acknowledgment failed:", result.error);
  }
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
  const resolved = resolveTemplateComponents(templateName, { order });
  if (!resolved) return;

  return sendWhatsAppTemplate({
    phone: order.phone,
    messageType: "order_confirmed",
    templateName,
    components: resolved.components,
    orderId: order.id,
    languageCode: resolved.languageCode,
  });
}

export async function sendOrderStatusNotification(
  order: Order,
  newStatus: OrderStatus,
  extras?: { estimatedArrival?: string }
) {
  const config = getWhatsAppConfig();

  if (newStatus === "confirmed") {
    return sendOrderConfirmedNotification(order);
  }

  let templateName: string | null = null;
  if (newStatus === "out_for_delivery") {
    templateName = config?.templates.orderDispatch ?? "order_out_for_delivery_v2";
  } else if (newStatus === "cancelled") {
    templateName = config?.templates.orderCancelled ?? "order_cancelled";
  } else if (
    newStatus === "preparing" ||
    newStatus === "delivered" ||
    newStatus === "self_delivered"
  ) {
    templateName = config?.templates.orderStatus ?? "order_status_update";
  }

  if (!templateName) return;

  const resolved = resolveTemplateComponents(templateName, {
    order,
    status: newStatus,
    extras,
  });
  if (!resolved) return;

  const messageType =
    newStatus === "out_for_delivery"
      ? "order_out_for_delivery"
      : newStatus === "cancelled"
        ? "order_cancelled"
        : `order_status_${newStatus}`;

  return sendWhatsAppTemplate({
    phone: order.phone,
    messageType,
    templateName,
    components: resolved.components,
    orderId: order.id,
    languageCode: resolved.languageCode,
  });
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
