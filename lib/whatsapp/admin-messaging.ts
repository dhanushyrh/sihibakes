import { createAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/lib/types";
import {
  getConversationById,
  insertWhatsAppMessage,
  previewForMessage,
  upsertConversation,
} from "@/lib/whatsapp/conversations";
import {
  sendWhatsAppTemplate,
  sendWhatsAppText,
  type TemplateComponent,
} from "@/lib/whatsapp/client";
import { getUtilityTemplateLanguageCode } from "@/lib/whatsapp/config";
import { resolveTemplateComponents } from "@/lib/whatsapp/template-components";
import { isWithinCustomerServiceWindow } from "@/lib/whatsapp/window";

type SendResult = {
  ok: boolean;
  messageId: string | null;
  error: string | null;
  dbMessageId?: string | null;
};

async function persistOutboundMessage(params: {
  conversationId: string;
  waMessageId: string | null;
  messageType: string;
  body?: string | null;
  templateName?: string | null;
  status: "sent" | "failed";
  errorMessage?: string | null;
  orderId?: string | null;
}): Promise<string | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const preview = previewForMessage(params.messageType, params.body ?? params.templateName);

  await admin
    .from("whatsapp_conversations")
    .update({
      last_message_at: now,
      last_message_preview: preview,
      updated_at: now,
    })
    .eq("id", params.conversationId);

  const row = await insertWhatsAppMessage(admin, {
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

  return row?.id ?? null;
}

async function findLatestOrderForPhone(phone: string): Promise<Order | null> {
  const admin = createAdminClient();
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 10) return null;

  const { data } = await admin
    .from("orders")
    .select("*")
    .or(`phone.ilike.%${digits},alt_phone.ilike.%${digits}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Order | null) ?? null;
}

export async function sendConversationTextReply(params: {
  conversationId: string;
  text: string;
}): Promise<SendResult> {
  const admin = createAdminClient();
  const conversation = await getConversationById(admin, params.conversationId);
  if (!conversation) {
    return { ok: false, messageId: null, error: "Conversation not found" };
  }

  if (!isWithinCustomerServiceWindow(conversation.last_customer_message_at)) {
    return {
      ok: false,
      messageId: null,
      error:
        "The 24-hour customer service window has closed. Send an approved template to re-open the conversation.",
    };
  }

  const trimmed = params.text.trim();
  if (!trimmed) {
    return { ok: false, messageId: null, error: "Message cannot be empty" };
  }

  const result = await sendWhatsAppText({
    phone: conversation.phone,
    text: trimmed,
    bypassNotificationsToggle: true,
  });

  const dbMessageId = await persistOutboundMessage({
    conversationId: conversation.id,
    waMessageId: result.messageId,
    messageType: "text",
    body: trimmed,
    status: result.ok ? "sent" : "failed",
    errorMessage: result.error,
  });

  return { ...result, dbMessageId };
}

export async function sendConversationTemplate(params: {
  conversationId: string;
  templateName: string;
  components?: TemplateComponent[];
  languageCode?: string;
  orderId?: string | null;
}): Promise<SendResult> {
  const admin = createAdminClient();
  const conversation = await getConversationById(admin, params.conversationId);
  if (!conversation) {
    return { ok: false, messageId: null, error: "Conversation not found" };
  }

  let components = params.components;
  let languageCode = params.languageCode;
  let orderId = params.orderId ?? null;

  if (!components?.length) {
    const order =
      orderId != null
        ? (
            await admin.from("orders").select("*").eq("id", orderId).maybeSingle()
          ).data
        : await findLatestOrderForPhone(conversation.phone);

    if (order) {
      orderId = (order as Order).id;
      const resolved = resolveTemplateComponents(params.templateName, {
        order: order as Order,
      });
      if (resolved) {
        components = resolved.components;
        languageCode = languageCode ?? resolved.languageCode;
      }
    }
  }

  const result = await sendWhatsAppTemplate({
    phone: conversation.phone,
    messageType: "admin_chat",
    templateName: params.templateName,
    components,
    languageCode: languageCode ?? getUtilityTemplateLanguageCode(),
    orderId,
    skipChatPersistence: true,
    bypassNotificationsToggle: true,
  });

  const dbMessageId = await persistOutboundMessage({
    conversationId: conversation.id,
    waMessageId: result.messageId,
    messageType: "template",
    body: null,
    templateName: params.templateName,
    status: result.ok ? "sent" : "failed",
    errorMessage: result.error,
    orderId,
  });

  return { ...result, dbMessageId };
}

export async function ensureConversationForPhone(
  phone: string,
  displayName?: string | null
): Promise<{ id: string } | null> {
  const admin = createAdminClient();
  const { formatPhoneForWhatsApp } = await import("@/lib/whatsapp/phone");
  const waId = formatPhoneForWhatsApp(phone);
  if (!waId) return null;
  return upsertConversation(admin, {
    waId,
    displayName: displayName ?? null,
    lastMessageAt: new Date().toISOString(),
  });
}
