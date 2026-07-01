import { STORE_CONTACT } from "@/lib/constants";
import { statusChangeLabel } from "@/lib/order-status-update";
import { formatDisplayPhone } from "@/lib/storefront";
import type { Order, OrderStatus } from "@/lib/types";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import type { TemplateComponent } from "@/lib/whatsapp/client";
import {
  getExpectedBodyParamCount,
  getTemplateLanguageCode,
  WHATSAPP_AUTH_OTP_TEMPLATE,
  WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE,
  WHATSAPP_REACH_CONFIRMATION_TEMPLATE,
} from "@/lib/whatsapp/template-registry";

export {
  WHATSAPP_AUTH_OTP_TEMPLATE,
  WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE,
  WHATSAPP_REACH_CONFIRMATION_TEMPLATE,
} from "@/lib/whatsapp/template-registry";

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

/** Grand total paid by customer (subtotal − coupon discount + delivery). */
export function orderGrandTotalInr(
  order: Pick<Order, "subtotal_inr" | "discount_inr" | "delivery_fee_inr" | "total_inr">
): number {
  const computed =
    order.subtotal_inr - (order.discount_inr ?? 0) + (order.delivery_fee_inr ?? 0);
  // Prefer computed total when stored total_inr omits delivery (legacy data).
  return Math.max(0, Math.max(computed, order.total_inr));
}

export function formatOrderTotalForWhatsApp(
  order: Pick<Order, "subtotal_inr" | "discount_inr" | "delivery_fee_inr" | "total_inr">
): string {
  return formatInr(orderGrandTotalInr(order));
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
        textParam(formatOrderTotalForWhatsApp(order)),
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

function countBodyParams(components: TemplateComponent[]): number {
  return components.find((component) => component.type === "body")?.parameters.length ?? 0;
}

function validateResolvedTemplate(
  templateName: string,
  payload: ResolvedTemplatePayload
): ResolvedTemplatePayload | null {
  const expected = getExpectedBodyParamCount(templateName);
  if (expected == null) return payload;

  const actual = countBodyParams(payload.components);
  if (actual !== expected) {
    console.error(
      `WhatsApp template "${templateName}" expects ${expected} body params, got ${actual}`
    );
    return null;
  }

  return payload;
}

function finalizeTemplatePayload(
  templateName: string,
  components: TemplateComponent[]
): ResolvedTemplatePayload | null {
  return validateResolvedTemplate(templateName, {
    components,
    languageCode: getTemplateLanguageCode(templateName),
  });
}

export function resolveTemplateComponents(
  templateName: string,
  params: {
    order?: Order | null;
    code?: string;
    supportPhone?: string | null;
    enquiry?: { name: string; reference: string };
    status?: OrderStatus;
    extras?: { estimatedArrival?: string };
  }
): ResolvedTemplatePayload | null {
  const config = getWhatsAppConfig();
  const normalized = templateName.trim().toLowerCase();

  const templates = config?.templates;
  const orderPlaced = templates?.orderPlaced ?? "order_confirmed";
  const orderConfirmed = templates?.orderConfirmed ?? "order_confirmed";
  const orderStatus = templates?.orderStatus ?? "order_status_update";
  const orderDispatch = templates?.orderDispatch ?? "order_out_for_delivery_v2";
  const orderCancelled = templates?.orderCancelled ?? "order_cancelled";
  const otp = templates?.otp ?? WHATSAPP_REACH_CONFIRMATION_TEMPLATE;
  const enquiryReceived =
    templates?.enquiryReceived ?? WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE;

  if (normalized === otp.toLowerCase()) {
    if (!params.code) return null;
    return finalizeTemplatePayload(otp, buildCheckoutOtpTemplateComponents(
      otp,
      params.code,
      params.supportPhone
    ));
  }

  if (normalized === enquiryReceived.toLowerCase()) {
    if (!params.enquiry) return null;
    return finalizeTemplatePayload(
      enquiryReceived,
      buildEnquiryReceivedComponents(params.enquiry.name, params.enquiry.reference)
    );
  }

  const order = params.order;
  if (!order) return null;

  if (normalized === orderPlaced.toLowerCase()) {
    return finalizeTemplatePayload(
      orderPlaced,
      buildOrderPlacedComponents(order)
    );
  }

  if (normalized === orderConfirmed.toLowerCase()) {
    return finalizeTemplatePayload(
      orderConfirmed,
      buildOrderConfirmedComponents(order)
    );
  }

  if (normalized === orderStatus.toLowerCase()) {
    const status = params.status ?? "preparing";
    return finalizeTemplatePayload(
      orderStatus,
      buildOrderStatusComponents(order, status)
    );
  }

  if (normalized === orderDispatch.toLowerCase()) {
    return finalizeTemplatePayload(
      orderDispatch,
      buildOrderDispatchComponents(order, params.extras)
    );
  }

  if (normalized === orderCancelled.toLowerCase()) {
    return finalizeTemplatePayload(
      orderCancelled,
      buildOrderCancelledComponents(order)
    );
  }

  return null;
}
