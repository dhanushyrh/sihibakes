import { STORE_CONTACT } from "@/lib/constants";
import { statusChangeLabel } from "@/lib/order-status-update";
import { formatDisplayPhone } from "@/lib/storefront";
import type { Order, OrderStatus } from "@/lib/types";
import { getWhatsAppConfig, getUtilityTemplateLanguageCode } from "@/lib/whatsapp/config";
import type { TemplateComponent } from "@/lib/whatsapp/client";

/** Meta AUTHENTICATION template (requires TIER_2K). */
export const WHATSAPP_AUTH_OTP_TEMPLATE = "checkout_otp";

/** Default UTILITY reach-confirmation template (checkout id delivery). */
export const WHATSAPP_REACH_CONFIRMATION_TEMPLATE = "reach_confirmation";

/** Default UTILITY enquiry acknowledgment template. */
export const WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE = "enquiry_received";

export function isAuthenticationOtpTemplate(templateName: string): boolean {
  return templateName.trim().toLowerCase() === WHATSAPP_AUTH_OTP_TEMPLATE;
}

export function formatOtpSupportPhone(phone?: string | null): string {
  const formatted = formatDisplayPhone(phone?.trim() || STORE_CONTACT.phone);
  return formatted || STORE_CONTACT.phone;
}

function textParam(value: string) {
  return { type: "text" as const, text: value.slice(0, 1024) };
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDeliverySlot(
  order: Pick<Order, "delivery_date" | "delivery_window_start" | "delivery_window_end">
): string {
  return `${order.delivery_date}, ${order.delivery_window_start.slice(0, 5)}–${order.delivery_window_end.slice(0, 5)}`;
}

export function formatExpectedDelivery(
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

function firstName(order: Pick<Order, "customer_name">): string {
  return order.customer_name.trim().split(/\s+/)[0] || "there";
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

export function buildCheckoutOtpAuthComponents(code: string): TemplateComponent[] {
  return [
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
}

export function buildReachConfirmationComponents(
  referenceId: string,
  supportPhone?: string | null
): TemplateComponent[] {
  return [
    {
      type: "body",
      parameters: [
        textParam(referenceId),
        textParam(formatOtpSupportPhone(supportPhone)),
      ],
    },
  ];
}

function enquiryFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

export function buildEnquiryReceivedComponents(
  name: string,
  enquiryReference: string
): TemplateComponent[] {
  return [
    {
      type: "body",
      parameters: [
        textParam(enquiryFirstName(name)),
        textParam(enquiryReference),
      ],
    },
  ];
}

/** @deprecated Use buildReachConfirmationComponents */
export function buildCheckoutOtpComponents(
  code: string,
  supportPhone?: string | null
): TemplateComponent[] {
  return buildReachConfirmationComponents(code, supportPhone);
}

export function buildCheckoutOtpTemplateComponents(
  templateName: string,
  code: string,
  supportPhone?: string | null
): TemplateComponent[] {
  if (isAuthenticationOtpTemplate(templateName)) {
    return buildCheckoutOtpAuthComponents(code);
  }
  return buildReachConfirmationComponents(code, supportPhone);
}

export function buildOrderPlacedComponents(order: Order): TemplateComponent[] {
  // order_placed uses the same order_confirmed template (4 body variables).
  return buildOrderConfirmedComponents(order);
}

export function buildOrderConfirmedComponents(order: Order): TemplateComponent[] {
  return [
    {
      type: "body",
      parameters: [
        textParam(firstName(order)),
        textParam(order.order_number),
        textParam(formatInr(order.total_inr)),
        textParam(formatDeliverySlot(order)),
      ],
    },
  ];
}

export function buildOrderStatusComponents(
  order: Order,
  status: OrderStatus
): TemplateComponent[] {
  return [
    {
      type: "body",
      parameters: [
        textParam(order.order_number),
        textParam(statusChangeLabel(status)),
        textParam(statusDetailMessage(status)),
      ],
    },
  ];
}

export function buildOrderDispatchComponents(
  order: Order,
  extras?: { estimatedArrival?: string }
): TemplateComponent[] {
  const estimatedArrival =
    extras?.estimatedArrival?.trim() || formatDeliverySlot(order);

  return [
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
}

export function buildOrderCancelledComponents(order: Order): TemplateComponent[] {
  return [
    {
      type: "body",
      parameters: [
        textParam(order.order_number),
        textParam(order.cancellation_notes?.trim() || "Cancelled by kitchen"),
      ],
    },
  ];
}

export type ResolvedTemplatePayload = {
  components: TemplateComponent[];
  languageCode: string;
};

export function resolveTemplateComponents(
  templateName: string,
  params: {
    order?: Order | null;
    code?: string;
    supportPhone?: string | null;
    status?: OrderStatus;
    extras?: { estimatedArrival?: string };
  }
): ResolvedTemplatePayload | null {
  const config = getWhatsAppConfig();
  const utilityLanguage = getUtilityTemplateLanguageCode();
  const otpLanguage = config?.otpLanguageCode ?? "en_US";
  const normalized = templateName.trim().toLowerCase();

  const templates = config?.templates;
  const orderPlaced = templates?.orderPlaced ?? "order_confirmed";
  const orderConfirmed = templates?.orderConfirmed ?? "order_confirmed";
  const orderStatus = templates?.orderStatus ?? "order_status_update";
  const orderDispatch = templates?.orderDispatch ?? "order_out_for_delivery_v2";
  const orderCancelled = templates?.orderCancelled ?? "order_cancelled";
  const otp = templates?.otp ?? WHATSAPP_REACH_CONFIRMATION_TEMPLATE;

  if (normalized === otp.toLowerCase()) {
    if (!params.code) return null;
    return {
      components: buildCheckoutOtpTemplateComponents(
        otp,
        params.code,
        params.supportPhone
      ),
      languageCode: otpLanguage,
    };
  }

  const order = params.order;
  if (!order) return null;

  if (normalized === orderPlaced.toLowerCase()) {
    return {
      components: buildOrderPlacedComponents(order),
      languageCode:
        config?.orderPlacedLanguageCode ?? getUtilityTemplateLanguageCode(),
    };
  }

  if (normalized === orderConfirmed.toLowerCase()) {
    return {
      components: buildOrderConfirmedComponents(order),
      languageCode: getUtilityTemplateLanguageCode(),
    };
  }

  if (normalized === orderStatus.toLowerCase()) {
    const status = params.status ?? "preparing";
    return {
      components: buildOrderStatusComponents(order, status),
      languageCode: utilityLanguage,
    };
  }

  if (normalized === orderDispatch.toLowerCase()) {
    return {
      components: buildOrderDispatchComponents(order, params.extras),
      languageCode: utilityLanguage,
    };
  }

  if (normalized === orderCancelled.toLowerCase()) {
    return {
      components: buildOrderCancelledComponents(order),
      languageCode: utilityLanguage,
    };
  }

  return null;
}
