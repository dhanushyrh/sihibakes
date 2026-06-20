export type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  templates: {
    otp: string;
    orderConfirmed: string;
    orderStatus: string;
    orderDispatch: string;
    orderCancelled: string;
  };
  languageCode: string;
};

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  );
}

export function getWhatsAppConfig(): WhatsAppConfig | null {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!accessToken || !phoneNumberId) return null;

  return {
    accessToken,
    phoneNumberId,
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || "v21.0",
    languageCode: process.env.WHATSAPP_LANGUAGE_CODE?.trim() || "en",
    templates: {
      otp: process.env.WHATSAPP_TEMPLATE_OTP?.trim() || "checkout_otp",
      orderConfirmed:
        process.env.WHATSAPP_TEMPLATE_ORDER_CONFIRMED?.trim() || "order_confirmed",
      orderStatus:
        process.env.WHATSAPP_TEMPLATE_ORDER_STATUS?.trim() || "order_status_update",
      orderDispatch:
        process.env.WHATSAPP_TEMPLATE_ORDER_DISPATCH?.trim() || "order_out_for_delivery",
      orderCancelled:
        process.env.WHATSAPP_TEMPLATE_ORDER_CANCELLED?.trim() || "order_cancelled",
    },
  };
}
