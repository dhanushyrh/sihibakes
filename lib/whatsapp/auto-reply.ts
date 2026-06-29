import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import { isWhatsAppConfigured } from "@/lib/whatsapp/config";
import {
  insertWhatsAppMessage,
  previewForMessage,
} from "@/lib/whatsapp/conversations";
import { isWithinCustomerServiceWindow } from "@/lib/whatsapp/window";

const DEFAULT_STORE_URL = "https://sihibakes.in/orders";

export function isNewServiceWindow(
  previousLastCustomerMessageAt: string | null | undefined
): boolean {
  if (!previousLastCustomerMessageAt) return true;
  return !isWithinCustomerServiceWindow(previousLastCustomerMessageAt);
}

export function isAutoReplyEnabled(): boolean {
  if (!isWhatsAppConfigured()) return false;
  const raw = process.env.WHATSAPP_AUTO_REPLY_ENABLED?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return true;
}

function resolveStoreUrl(): string {
  const override = process.env.WHATSAPP_AUTO_REPLY_STORE_URL?.trim();
  if (override) return override.replace(/\/$/, "");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl && !appUrl.includes("localhost")) {
    return `${appUrl}/orders`;
  }
  return DEFAULT_STORE_URL;
}

export function buildWelcomeAutoReplyText(): string {
  const storeUrl = resolveStoreUrl();
  return `Thanks for reaching out to Sihi Bakes!\n\nYou can browse our menu and place orders directly from our online store:\n${storeUrl} Thank you`;
}

export async function sendWelcomeAutoReply(
  admin: SupabaseClient,
  params: {
    conversationId: string;
    phone: string;
    previousLastCustomerMessageAt: string | null | undefined;
  }
): Promise<void> {
  try {
    if (!isAutoReplyEnabled()) return;
    if (!isNewServiceWindow(params.previousLastCustomerMessageAt)) return;

    const text = buildWelcomeAutoReplyText();
    const result = await sendWhatsAppText({
      phone: params.phone,
      text,
    });

    const now = new Date().toISOString();
    const preview = previewForMessage("auto_reply", text);

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
      waMessageId: result.messageId,
      messageType: "auto_reply",
      body: text,
      status: result.ok ? "sent" : "failed",
      errorMessage: result.error,
      sentAt: result.ok ? now : null,
    });

    if (!result.ok) {
      console.error("WhatsApp welcome auto-reply failed:", result.error);
    }
  } catch (err) {
    console.error("WhatsApp welcome auto-reply error:", err);
  }
}
