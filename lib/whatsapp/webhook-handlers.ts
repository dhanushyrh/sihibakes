import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWelcomeAutoReply } from "@/lib/whatsapp/auto-reply";
import {
  insertWhatsAppMessage,
  previewForMessage,
  updateMessageStatus,
  upsertConversation,
  waIdToPhone,
} from "@/lib/whatsapp/conversations";
import type { WhatsAppMessageStatus } from "@/lib/types";

type MetaContact = {
  profile?: { name?: string };
  wa_id?: string;
};

type MetaMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string; filename?: string };
  audio?: Record<string, unknown>;
  sticker?: Record<string, unknown>;
  location?: { latitude?: number; longitude?: number };
  button?: { text?: string };
  interactive?: { type?: string; button_reply?: { title?: string }; list_reply?: { title?: string } };
};

type MetaStatus = {
  id: string;
  status: string;
  timestamp: string;
  recipient_id?: string;
  errors?: { title?: string; message?: string }[];
};

type MetaChangeValue = {
  messaging_product?: string;
  metadata?: { phone_number_id?: string };
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
};

type MetaWebhookPayload = {
  object?: string;
  entry?: {
    id?: string;
    changes?: { field?: string; value?: MetaChangeValue }[];
  }[];
};

function extractMessageBody(message: MetaMessage): string | null {
  if (message.type === "text") return message.text?.body ?? null;
  if (message.type === "image") return message.image?.caption ?? null;
  if (message.type === "video") return message.video?.caption ?? null;
  if (message.type === "document") {
    return message.document?.caption ?? message.document?.filename ?? null;
  }
  if (message.type === "button") return message.button?.text ?? null;
  if (message.type === "interactive") {
    return (
      message.interactive?.button_reply?.title ??
      message.interactive?.list_reply?.title ??
      null
    );
  }
  return null;
}

function mapDeliveryStatus(status: string): WhatsAppMessageStatus | null {
  switch (status) {
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

async function handleInboundMessage(
  admin: SupabaseClient,
  message: MetaMessage,
  contact?: MetaContact
): Promise<void> {
  const waId = message.from;
  const body = extractMessageBody(message);
  const preview = previewForMessage(message.type, body);
  const messageAt = new Date(Number(message.timestamp) * 1000).toISOString();

  const { data: existingInbound } = await admin
    .from("whatsapp_messages")
    .select("id")
    .eq("wa_message_id", message.id)
    .maybeSingle();
  if (existingInbound) return;

  const { data: existingConversation } = await admin
    .from("whatsapp_conversations")
    .select("id, last_customer_message_at, phone")
    .eq("wa_id", waId)
    .maybeSingle();

  const previousLastCustomerMessageAt =
    existingConversation?.last_customer_message_at ?? null;

  const conversation = await upsertConversation(admin, {
    waId,
    displayName: contact?.profile?.name ?? null,
    lastCustomerMessageAt: messageAt,
    lastMessageAt: messageAt,
    lastMessagePreview: preview,
    incrementUnread: true,
  });

  if (!conversation) return;

  await insertWhatsAppMessage(admin, {
    conversationId: conversation.id,
    direction: "inbound",
    waMessageId: message.id,
    messageType: message.type,
    body,
    payload: message as unknown as Record<string, unknown>,
    status: "received",
    createdAt: messageAt,
  });

  await sendWelcomeAutoReply(admin, {
    conversationId: conversation.id,
    phone: existingConversation?.phone ?? waIdToPhone(waId),
    previousLastCustomerMessageAt,
  });
}

async function handleStatusUpdate(
  admin: SupabaseClient,
  status: MetaStatus
): Promise<void> {
  const mapped = mapDeliveryStatus(status.status);
  if (!mapped) return;
  await updateMessageStatus(admin, status.id, mapped, status.timestamp);
}

export async function processWhatsAppWebhook(
  admin: SupabaseClient,
  payload: MetaWebhookPayload
): Promise<void> {
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      const contactByWaId = new Map<string, MetaContact>();
      for (const contact of value.contacts ?? []) {
        if (contact.wa_id) contactByWaId.set(contact.wa_id, contact);
      }

      for (const message of value.messages ?? []) {
        await handleInboundMessage(
          admin,
          message,
          contactByWaId.get(message.from)
        );
      }

      for (const status of value.statuses ?? []) {
        await handleStatusUpdate(admin, status);
      }
    }
  }
}
