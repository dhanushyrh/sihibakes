import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { sendConversationTemplate } from "@/lib/whatsapp/admin-messaging";
import type { TemplateComponent } from "@/lib/whatsapp/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = (await request.json()) as {
    templateName?: string;
    components?: TemplateComponent[];
    languageCode?: string;
    orderId?: string | null;
  };

  const templateName = String(body.templateName ?? "").trim();
  if (!templateName) {
    return NextResponse.json(
      { error: "templateName is required" },
      { status: 400 }
    );
  }

  const config = getWhatsAppConfig();
  const result = await sendConversationTemplate({
    conversationId: id,
    templateName,
    components: body.components,
    languageCode: body.languageCode ?? config?.languageCode,
    orderId: body.orderId ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    dbMessageId: result.dbMessageId,
  });
}
