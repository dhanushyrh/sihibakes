export type CustomerWhatsAppStatus = "sent" | "pending";

export type WhatsAppLogSummary = {
  status: string;
} | null;

/** Customer-safe WhatsApp delivery state — never exposes API error text. */
export function getCustomerWhatsAppStatus(
  log: WhatsAppLogSummary
): CustomerWhatsAppStatus | null {
  if (!log) return null;
  if (log.status === "sent") return "sent";
  return "pending";
}

export const CUSTOMER_WHATSAPP_SENT_MESSAGE =
  "Order confirmation sent to your WhatsApp number.";

export const CUSTOMER_WHATSAPP_PENDING_MESSAGE =
  "We'll confirm your order shortly. You can also message us on WhatsApp if needed.";

export const CUSTOMER_WHATSAPP_SENT_DEV_HINT =
  "Check chats from the business test number if you do not see it immediately.";
