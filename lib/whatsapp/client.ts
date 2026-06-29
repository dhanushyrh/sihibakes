import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppConfig, isWhatsAppConfigured } from "@/lib/whatsapp/config";
import { formatPhoneForWhatsApp } from "@/lib/whatsapp/phone";
import {
  insertWhatsAppMessage,
  previewForMessage,
  upsertConversation,
} from "@/lib/whatsapp/conversations";
import {
  alertOrderPlacedWhatsAppFailure,
  classifyPlainWhatsAppError,
} from "@/lib/whatsapp/admin-alerts";
import {
  formatWhatsAppErrorForAdmin,
  parseWhatsAppApiError,
} from "@/lib/whatsapp/errors";

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

type SendTextResult = {
  ok: boolean;
  messageId: string | null;
  error: string | null;
};

async function persistChatOutbound(params: {
  phone: string;
  conversationId?: string | null;
  waMessageId: string | null;
  messageType: string;
  body?: string | null;
  templateName?: string | null;
  status: "sent" | "failed";
  errorMessage?: string | null;
  orderId?: string | null;
}) {
  if (!params.conversationId) return;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const preview = previewForMessage(
    params.messageType,
    params.body ?? params.templateName
  );

  await admin
    .from("whatsapp_conversations")
    .update({
      last_message_at: now,
      last_message_preview: preview,
      updated_at: now,
    })
    .eq("id", params.conversationId);

  await insertWhatsAppMessage(admin, {
    conversationId: params.conversationId,
    direction: "outbound",
    waMessageId: params.waMessageId,
    messageType: params.messageType,
    body: params.body ?? null,
    templateName: params.templateName ?? null,
    status: params.status,
    errorMessage: params.errorMessage ?? null,
    orderId: params.orderId ?? null,
    sentAt: params.status === "sent" ? now : null,
  });
}

async function ensureConversationId(
  phone: string,
  conversationId?: string | null
): Promise<string | null> {
  if (conversationId) return conversationId;
  const waPhone = formatPhoneForWhatsApp(phone);
  if (!waPhone) return null;
  const admin = createAdminClient();
  const row = await upsertConversation(admin, {
    waId: waPhone,
    lastMessageAt: new Date().toISOString(),
  });
  return row?.id ?? null;
}

async function maybeAlertOrderPlacedFailure(params: {
  messageType: string;
  orderId?: string | null;
  phone: string;
  errorDetail: string;
  apiError?: { message?: string; code?: number };
}) {
  if (params.messageType !== "order_placed" || !params.orderId) return;

  const parsed = params.apiError
    ? parseWhatsAppApiError(params.apiError)
    : classifyPlainWhatsAppError(params.errorDetail);

  try {
    await alertOrderPlacedWhatsAppFailure({
      orderId: params.orderId,
      errorDetail: params.errorDetail,
      severity: parsed.severity,
      isAuthError: parsed.isAuthError,
      customerPhone: params.phone,
    });
  } catch (err) {
    console.error("Admin alert for WhatsApp failure failed:", err);
  }
}

async function logMessage(params: {
  phone: string;
  messageType: string;
  templateName: string | null;
  orderId?: string | null;
  status: "sent" | "failed" | "skipped";
  errorMessage?: string | null;
  whatsappMessageId?: string | null;
  apiError?: { message?: string; code?: number };
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

  if (
    params.messageType === "order_placed" &&
    params.orderId &&
    (params.status === "failed" || params.status === "skipped")
  ) {
    const errorDetail =
      params.errorMessage?.trim() ||
      (params.status === "skipped" ? "WhatsApp not configured" : "Send failed");

    await maybeAlertOrderPlacedFailure({
      messageType: params.messageType,
      orderId: params.orderId,
      phone: params.phone,
      errorDetail,
      apiError: params.apiError,
    });
  }
}

export async function sendWhatsAppTemplate(params: {
  phone: string;
  messageType: string;
  templateName: string;
  components?: TemplateComponent[];
  orderId?: string | null;
  languageCode?: string;
  conversationId?: string | null;
  skipChatPersistence?: boolean;
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
    const error = "WhatsApp not configured";
    await logMessage({
      phone: params.phone,
      messageType: params.messageType,
      templateName: params.templateName,
      orderId: params.orderId,
      status: "skipped",
      errorMessage: error,
    });
    return { ok: false, messageId: null, error };
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
      error?: { message?: string; code?: number };
    };

    if (!res.ok) {
      const error =
        formatWhatsAppErrorForAdmin(data.error) ||
        `WhatsApp API error (${res.status})`;
      console.error("WhatsApp send failed:", error, data);
      await logMessage({
        phone: params.phone,
        messageType: params.messageType,
        templateName: params.templateName,
        orderId: params.orderId,
        status: "failed",
        errorMessage: error,
        apiError: data.error,
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
    if (!params.skipChatPersistence) {
      const chatConversationId = await ensureConversationId(
        params.phone,
        params.conversationId
      );
      await persistChatOutbound({
        phone: params.phone,
        conversationId: chatConversationId,
        waMessageId: messageId,
        messageType: "template",
        templateName: params.templateName,
        status: "sent",
        orderId: params.orderId,
      });
    }
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

export async function sendWhatsAppText(params: {
  phone: string;
  text: string;
  conversationId?: string | null;
  orderId?: string | null;
}): Promise<SendTextResult> {
  const waPhone = formatPhoneForWhatsApp(params.phone);
  if (!waPhone) {
    return { ok: false, messageId: null, error: "Invalid phone number" };
  }

  const trimmed = params.text.trim();
  if (!trimmed) {
    return { ok: false, messageId: null, error: "Message cannot be empty" };
  }

  if (!isWhatsAppConfigured()) {
    return { ok: false, messageId: null, error: "WhatsApp not configured" };
  }

  const config = getWhatsAppConfig()!;
  const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: waPhone,
    type: "text",
    text: { body: trimmed },
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
      error?: { message?: string; code?: number };
    };

    if (!res.ok) {
      const error =
        formatWhatsAppErrorForAdmin(data.error) ||
        `WhatsApp API error (${res.status})`;
      console.error("WhatsApp text send failed:", error, data);
      return { ok: false, messageId: null, error };
    }

    const messageId = data.messages?.[0]?.id ?? null;
    return { ok: true, messageId, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : "WhatsApp request failed";
    console.error("WhatsApp text send error:", err);
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
