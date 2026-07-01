import {
  getUtilityTemplateLanguageCode,
  normalizeUtilityTemplateLanguageCode,
} from "@/lib/whatsapp/config";

/** Meta AUTHENTICATION template (requires TIER_2K). */
export const WHATSAPP_AUTH_OTP_TEMPLATE = "checkout_otp";

/** Default UTILITY order confirmation template (payment success). */
export const WHATSAPP_ORDER_CONFIRMED_TEMPLATE = "order_confirmed_v2";

/** Default UTILITY reach-confirmation template (checkout id delivery). */
export const WHATSAPP_REACH_CONFIRMATION_TEMPLATE = "reach_confirmation";

/** Default UTILITY enquiry acknowledgment template. */
export const WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE = "enquiry_received";

/** Kitchen started preparing — sent when status moves to preparing. */
export const WHATSAPP_ORDER_PREPARING_TEMPLATE = "order_preparing";

/** Order delivered — sent when status moves to delivered or self_delivered. */
export const WHATSAPP_ORDER_DELIVERED_TEMPLATE = "order_delivered";

/** Order out for delivery with partner, ref code, and ETA. */
export const WHATSAPP_ORDER_ON_THE_WAY_TEMPLATE = "order_on_the_way_v2";

/** Approved Meta body variable counts for each default Sihi template name. */
export const WHATSAPP_TEMPLATE_BODY_PARAM_COUNTS: Record<string, number> = {
  [WHATSAPP_AUTH_OTP_TEMPLATE]: 1,
  [WHATSAPP_REACH_CONFIRMATION_TEMPLATE]: 2,
  [WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE]: 2,
  order_confirmed: 4,
  order_confirmed_v2: 4,
  order_preparing: 1,
  order_delivered: 1,
  order_on_the_way: 4,
  order_on_the_way_v2: 4,
  order_status_update: 3,
  order_out_for_delivery_v2: 4,
  order_cancelled: 2,
};

/** Default Meta locale per template name (utility templates use en_US). */
export const WHATSAPP_TEMPLATE_DEFAULT_LANGUAGES: Record<string, string> = {
  [WHATSAPP_AUTH_OTP_TEMPLATE]: "en",
  [WHATSAPP_REACH_CONFIRMATION_TEMPLATE]: "en_US",
  [WHATSAPP_ENQUIRY_RECEIVED_TEMPLATE]: "en_US",
  order_confirmed: "en_US",
  order_confirmed_v2: "en_US",
  order_preparing: "en_US",
  order_delivered: "en_US",
  order_on_the_way: "en_US",
  order_on_the_way_v2: "en_US",
  order_status_update: "en_US",
  order_out_for_delivery_v2: "en_US",
  order_cancelled: "en_US",
};

export function getTemplateLanguageCode(templateName: string): string {
  const normalized = templateName.trim().toLowerCase();

  if (normalized === WHATSAPP_AUTH_OTP_TEMPLATE) {
    const fromEnv = process.env.WHATSAPP_TEMPLATE_OTP_LANGUAGE?.trim();
    return fromEnv || WHATSAPP_TEMPLATE_DEFAULT_LANGUAGES[WHATSAPP_AUTH_OTP_TEMPLATE];
  }

  if (normalized === WHATSAPP_REACH_CONFIRMATION_TEMPLATE) {
    const fromEnv = process.env.WHATSAPP_TEMPLATE_OTP_LANGUAGE?.trim();
    return fromEnv
      ? normalizeUtilityTemplateLanguageCode(fromEnv)
      : WHATSAPP_TEMPLATE_DEFAULT_LANGUAGES[WHATSAPP_REACH_CONFIRMATION_TEMPLATE];
  }

  if (normalized === "order_confirmed") {
    const fromEnv = process.env.WHATSAPP_TEMPLATE_ORDER_PLACED_LANGUAGE?.trim();
    if (fromEnv) return normalizeUtilityTemplateLanguageCode(fromEnv);
  }

  const defaultLanguage = WHATSAPP_TEMPLATE_DEFAULT_LANGUAGES[normalized];
  if (defaultLanguage) return defaultLanguage;

  return getUtilityTemplateLanguageCode();
}

export function getExpectedBodyParamCount(templateName: string): number | null {
  return WHATSAPP_TEMPLATE_BODY_PARAM_COUNTS[templateName.trim().toLowerCase()] ?? null;
}
