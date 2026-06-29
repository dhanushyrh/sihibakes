import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { WHATSAPP_MESSAGES_PAGE_SIZE } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendConversationTextReply } from "@/lib/whatsapp/admin-messaging";
import {
  getConversationById,
  getConversationMessages,
  markConversationRead,
} from "@/lib/whatsapp/conversations";
import {
  customerServiceWindowExpiresAt,
  isWithinCustomerServiceWindow,
} from "@/lib/whatsapp/window";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const admin = createAdminClient();
  const conversation = await getConversationById(admin, id);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const limit = Math.min(
    200,
    Math.max(
      1,
      Number(url.searchParams.get("limit") ?? WHATSAPP_MESSAGES_PAGE_SIZE) ||
        WHATSAPP_MESSAGES_PAGE_SIZE
    )
  );
  const markRead = url.searchParams.get("markRead") !== "0";

  const messages = await getConversationMessages(admin, id, limit);
  if (markRead) {
    await markConversationRead(admin, id);
  }

  return NextResponse.json({
    conversation: {
      ...conversation,
      serviceWindowOpen: isWithinCustomerServiceWindow(
        conversation.last_customer_message_at
      ),
      serviceWindowExpiresAt: customerServiceWindowExpiresAt(
        conversation.last_customer_message_at
      )?.toISOString() ?? null,
    },
    messages,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = (await request.json()) as { text?: string };
  const text = String(body.text ?? "").trim();

  if (!text) {
    return NextResponse.json({ error: "Message text is required" }, { status: 400 });
  }

  const result = await sendConversationTextReply({ conversationId: id, text });

  if (!result.ok) {
    const status = result.error?.includes("24-hour") ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    dbMessageId: result.dbMessageId,
  });
}
