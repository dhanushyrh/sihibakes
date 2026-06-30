import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { markEnquiryRead } from "@/lib/enquiries";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const admin = createAdminClient();
  const enquiry = await markEnquiryRead(admin, id);

  if (!enquiry) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, enquiry });
}
