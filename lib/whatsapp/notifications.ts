import { BRAND } from "@/lib/constants";
import { statusChangeLabel } from "@/lib/order-status-update";
import type { Order, OrderStatus } from "@/lib/types";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import {
  hasSentMessage,
  sendWhatsAppTemplate,
  type TemplateComponent,
} from "@/lib/whatsapp/client";

function textParam(value: string) {
  return { type: "text" as const, text: value.slice(0, 1024) };
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDeliverySlot(order: Pick<Order, "delivery_date" | "delivery_window_start" | "delivery_window_end">) {
  return `${order.delivery_date}, ${order.delivery_window_start.slice(0, 5)}–${order.delivery_window_end.slice(0, 5)}`;
}

function formatExpectedDelivery(
  order: Pick<Order, "delivery_date" | "delivery_window_start" | "delivery_window_end">
): string {
  const date = new Date(`${order.delivery_date}T12:00:00`);
  const dateLabel = Number.isNaN(date.getTime())
    ? order.delivery_date
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
  const start = order.delivery_window_start.slice(0, 5);
  const end = order.delivery_window_end.slice(0, 5);
  return `${dateLabel}, ${start}–${end}`;
}

function statusDetailMessage(status: OrderStatus): string {
  switch (status) {
    case "preparing":
      return "Your order is being prepared in our kitchen.";
    case "delivered":
      return "Your order has been delivered. Enjoy!";
    case "self_delivered":
      return "Your order has been delivered by our team. Enjoy!";
    case "confirmed":
      return "Your order is confirmed and will be prepared soon.";
    default:
      return `Status: ${statusChangeLabel(status)}.`;
  }
}

export async function sendCheckoutOtp(phone: string, code: string) {
  const config = getWhatsAppConfig();
  const templateName = config?.templates.otp ?? "checkout_otp";

  const components: TemplateComponent[] = [
    {
      type: "body",
      parameters: [textParam(code)],
    },
    {
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [textParam(code)],
    },
  ];

  return sendWhatsAppTemplate({
    phone,
    messageType: "checkout_otp",
    templateName,
    components,
  });
}

/** Meta sample utility template: customer name, order id, expected delivery. */
export async function sendOrderPlacedNotification(order: Order) {
  if (await hasSentMessage(order.id, "order_placed")) return;

  const config = getWhatsAppConfig();
  const templateName =
    config?.templates.orderPlaced ?? "jaspers_market_order_confirmation_v1";
  const firstName = order.customer_name.trim().split(/\s+/)[0] || "there";

  const components: TemplateComponent[] = [
    {
      type: "body",
      parameters: [
        textParam(firstName),
        textParam(order.order_number),
        textParam(formatExpectedDelivery(order)),
      ],
    },
  ];

  return sendWhatsAppTemplate({
    phone: order.phone,
    messageType: "order_placed",
    templateName,
    components,
    orderId: order.id,
    languageCode: config?.orderPlacedLanguageCode ?? "en_US",
  });
}

export async function sendOrderConfirmedNotification(order: Order) {
  if (await hasSentMessage(order.id, "order_confirmed")) return;

  const config = getWhatsAppConfig();
  const templateName = config?.templates.orderConfirmed ?? "order_confirmed";
  const firstName = order.customer_name.trim().split(/\s+/)[0] || "there";

  const components: TemplateComponent[] = [
    {
      type: "body",
      parameters: [
        textParam(firstName),
        textParam(order.order_number),
        textParam(formatInr(order.total_inr)),
        textParam(formatDeliverySlot(order)),
      ],
    },
  ];

  return sendWhatsAppTemplate({
    phone: order.phone,
    messageType: "order_confirmed",
    templateName,
    components,
    orderId: order.id,
  });
}

export async function sendOrderStatusNotification(
  order: Order,
  newStatus: OrderStatus,
  extras?: { estimatedArrival?: string }
) {
  if (newStatus === "confirmed") {
    return sendOrderConfirmedNotification(order);
  }

  if (newStatus === "out_for_delivery") {
    const config = getWhatsAppConfig();
    const templateName = config?.templates.orderDispatch ?? "order_out_for_delivery";
    const estimatedArrival =
      extras?.estimatedArrival?.trim() ||
      formatDeliverySlot(order);

    const components: TemplateComponent[] = [
      {
        type: "body",
        parameters: [
          textParam(order.order_number),
          textParam(order.delivery_partner_name || "Delivery partner"),
          textParam(order.delivery_otp || "—"),
          textParam(estimatedArrival),
        ],
      },
    ];

    return sendWhatsAppTemplate({
      phone: order.phone,
      messageType: "order_out_for_delivery",
      templateName,
      components,
      orderId: order.id,
    });
  }

  if (newStatus === "cancelled") {
    const config = getWhatsAppConfig();
    const templateName = config?.templates.orderCancelled ?? "order_cancelled";

    const components: TemplateComponent[] = [
      {
        type: "body",
        parameters: [
          textParam(order.order_number),
          textParam(order.cancellation_notes?.trim() || "Cancelled by kitchen"),
        ],
      },
    ];

    return sendWhatsAppTemplate({
      phone: order.phone,
      messageType: "order_cancelled",
      templateName,
      components,
      orderId: order.id,
    });
  }

  if (newStatus === "preparing" || newStatus === "delivered" || newStatus === "self_delivered") {
    const config = getWhatsAppConfig();
    const templateName = config?.templates.orderStatus ?? "order_status_update";

    const components: TemplateComponent[] = [
      {
        type: "body",
        parameters: [
          textParam(order.order_number),
          textParam(statusChangeLabel(newStatus)),
          textParam(statusDetailMessage(newStatus)),
        ],
      },
    ];

    return sendWhatsAppTemplate({
      phone: order.phone,
      messageType: `order_status_${newStatus}`,
      templateName,
      components,
      orderId: order.id,
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

  if (!order) return;

  try {
    await sendOrderPlacedNotification(order as Order);
  } catch (err) {
    console.error("WhatsApp order placed notification failed:", err);
  }
}

export async function notifyOrderConfirmed(orderId: string) {
  return notifyOrderPlaced(orderId);
}

export function getWhatsAppSetupHint(): string {
  return `Configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID. Create approved templates in Meta Business Manager for ${BRAND.name}.`;
}
