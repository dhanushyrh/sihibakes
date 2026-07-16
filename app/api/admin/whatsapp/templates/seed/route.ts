import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  isWhatsAppTemplateManagementConfigured,
  seedSihiDefaultTemplates,
} from "@/lib/whatsapp/templates";

export async function POST() {
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

  const result = await seedSihiDefaultTemplates();

  return NextResponse.json({
    ok: result.ok,
    created: result.created,
    skipped: result.skipped,
    failed: result.failed,
    notes: result.notes,
    message:
      result.created.length > 0
        ? `Submitted ${result.created.length} template(s) for Meta review (status: PENDING).`
        : result.failed.length > 0
          ? "Some templates failed to create."
          : result.notes.length > 0
            ? result.notes.join(" · ")
            : "All default templates already exist.",
  });
}
