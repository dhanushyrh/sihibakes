export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  verifyToken: string | null;
  appSecret: string | null;
  businessAccountId: string | null;
  templates: {
    otp: string;
    orderPlaced: string;
    orderConfirmed: string;
    orderStatus: string;
    orderDispatch: string;
    orderCancelled: string;
  };
  languageCode: string;
  orderPlacedLanguageCode: string;
  otpLanguageCode: string;
};

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
}

export function isWhatsAppWebhookConfigured(): boolean {
  return Boolean(
    isWhatsAppConfigured() &&
      process.env.WHATSAPP_VERIFY_TOKEN?.trim() &&
      process.env.WHATSAPP_APP_SECRET?.trim()
  );
}

export async function isWhatsAppNotificationsEnabled(): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false;
  const { getShopSettings } = await import("@/lib/data");
  const settings = await getShopSettings();
  return settings?.whatsapp_notifications_enabled ?? true;
}

/** True when checkout shows the OTP on-screen instead of sending via WhatsApp. */
export async function isPhoneOtpDemoMode(): Promise<boolean> {
  if (!isWhatsAppConfigured()) return true;
  return !(await isWhatsAppNotificationsEnabled());
}

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;

  return {
    accessToken,
    phoneNumberId,
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || "v21.0",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || null,
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || null,
    businessAccountId:
      process.env.WHATSAPP_WABA_ID?.trim() ||
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() ||
      null,
    languageCode: process.env.WHATSAPP_LANGUAGE_CODE?.trim() || "en_US",
    otpLanguageCode:
      process.env.WHATSAPP_TEMPLATE_OTP_LANGUAGE?.trim() || "en",
    templates: {
      otp: process.env.WHATSAPP_TEMPLATE_OTP?.trim() || "checkout_otp",
      orderPlaced:
        process.env.WHATSAPP_TEMPLATE_ORDER_PLACED?.trim() ||
        "jaspers_market_order_confirmation_v1",
      orderConfirmed:
        process.env.WHATSAPP_TEMPLATE_ORDER_CONFIRMED?.trim() || "order_confirmed",
      orderStatus:
        process.env.WHATSAPP_TEMPLATE_ORDER_STATUS?.trim() || "order_status_update",
      orderDispatch:
        process.env.WHATSAPP_TEMPLATE_ORDER_DISPATCH?.trim() ||
        "order_out_for_delivery_v2",
      orderCancelled:
        process.env.WHATSAPP_TEMPLATE_ORDER_CANCELLED?.trim() || "order_cancelled",
    },
    orderPlacedLanguageCode:
      process.env.WHATSAPP_TEMPLATE_ORDER_PLACED_LANGUAGE?.trim() || "en_US",
  };
}
