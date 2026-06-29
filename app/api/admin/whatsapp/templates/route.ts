import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  createWhatsAppTemplate,
  isWhatsAppTemplateManagementConfigured,
  listWhatsAppTemplates,
  type CreateWhatsAppTemplateInput,
  type WhatsAppTemplateCategory,
} from "@/lib/whatsapp/templates";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (!isWhatsAppTemplateManagementConfigured()) {
    return NextResponse.json(
      {
        error:
          "Template API requires WHATSAPP_ACCESS_TOKEN and WHATSAPP_WABA_ID. The token also needs whatsapp_business_management permission.",
        configured: false,
        templates: [],
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;

  const result = await listWhatsAppTemplates({ status: status || undefined });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, templates: [] }, { status: 400 });
  }

  return NextResponse.json({
    configured: true,
    templates: result.templates,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  if (!isWhatsAppTemplateManagementConfigured()) {
    return NextResponse.json(
      {
        error:
          "Template API requires WHATSAPP_ACCESS_TOKEN and WHATSAPP_WABA_ID.",
      },
      { status: 503 }
    );
  }

  const body = (await request.json()) as Partial<CreateWhatsAppTemplateInput>;

  const name = String(body.name ?? "").trim();
  const language = String(body.language ?? "en").trim();
  const category = body.category as WhatsAppTemplateCategory | undefined;
  const components = body.components;

  if (!name || !category || !Array.isArray(components) || components.length === 0) {
    return NextResponse.json(
      {
        error:
          "Required fields: name, category (AUTHENTICATION|MARKETING|UTILITY), components[]",
      },
      { status: 400 }
    );
  }

  const result = await createWhatsAppTemplate({
    name,
    language,
    category,
    components,
    allowCategoryChange: body.allowCategoryChange,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    id: result.id,
    status: result.status,
  });
}
