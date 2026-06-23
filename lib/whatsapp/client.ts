import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppConfig, isWhatsAppConfigured } from "@/lib/whatsapp/config";
import { formatPhoneForWhatsApp } from "@/lib/whatsapp/phone";

export type TemplateParameter = {
  type: "text";
  text: string;
};

export type TemplateComponent = {
  type: "body" | "button";
  sub_type?: "url";
  index?: string;
  parameters: TemplateParameter[];
};

type SendTemplateResult = {
  ok: boolean;
  messageId: string | null;
  error: string | null;
};

async function logMessage(params: {
  phone: string;
  messageType: string;
  templateName: string | null;
  orderId?: string | null;
  status: "sent" | "failed" | "skipped";
  errorMessage?: string | null;
  whatsappMessageId?: string | null;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("whatsapp_message_log").insert({
      phone: params.phone,
      message_type: params.messageType,
      template_name: params.templateName,
      order_id: params.orderId ?? null,
      status: params.status,
      error_message: params.errorMessage ?? null,
      whatsapp_message_id: params.whatsappMessageId ?? null,
    });
  } catch (err) {
    console.error("WhatsApp log insert failed:", err);
  }
}

export async function sendWhatsAppTemplate(params: {
  phone: string;
  messageType: string;
  templateName: string;
  components?: TemplateComponent[];
  orderId?: string | null;
  languageCode?: string;
}): Promise<SendTemplateResult> {
  const waPhone = formatPhoneForWhatsApp(params.phone);
  if (!waPhone) {
    const error = "Invalid phone number";
    await logMessage({
      phone: params.phone,
      messageType: params.messageType,
      templateName: params.templateName,
      orderId: params.orderId,
      status: "failed",
      errorMessage: error,
    });
    return { ok: false, messageId: null, error };
  }

  if (!isWhatsAppConfigured()) {
    await logMessage({
      phone: params.phone,
      messageType: params.messageType,
      templateName: params.templateName,
      orderId: params.orderId,
      status: "skipped",
      errorMessage: "WhatsApp not configured",
    });
    return { ok: false, messageId: null, error: "WhatsApp not configured" };
  }

  const config = getWhatsAppConfig()!;
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: waPhone,
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.languageCode ?? config.languageCode },
      ...(params.components?.length ? { components: params.components } : {}),
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      const error = data.error?.message || `WhatsApp API error (${res.status})`;
      console.error("WhatsApp send failed:", error, data);
      await logMessage({
        phone: params.phone,
        messageType: params.messageType,
        templateName: params.templateName,
        orderId: params.orderId,
        status: "failed",
        errorMessage: error,
      });
      return { ok: false, messageId: null, error };
    }

    const messageId = data.messages?.[0]?.id ?? null;
    await logMessage({
      phone: params.phone,
      messageType: params.messageType,
      templateName: params.templateName,
      orderId: params.orderId,
      status: "sent",
      whatsappMessageId: messageId,
    });
    return { ok: true, messageId, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : "WhatsApp request failed";
    console.error("WhatsApp send error:", err);
    await logMessage({
      phone: params.phone,
      messageType: params.messageType,
      templateName: params.templateName,
      orderId: params.orderId,
      status: "failed",
      errorMessage: error,
    });
    return { ok: false, messageId: null, error };
  }
}

export async function hasSentMessage(
  orderId: string,
  messageType: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("whatsapp_message_log")
    .select("id")
    .eq("order_id", orderId)
    .eq("message_type", messageType)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}
