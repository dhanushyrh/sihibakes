import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import type { EnquiryStatus } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_STATUSES: EnquiryStatus[] = [
  "new",
  "in_progress",
  "replied",
  "closed",
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("contact_enquiries")
    .select("*, enquiry_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  }

  return NextResponse.json({ enquiry: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, string> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (body.admin_notes !== undefined) {
    updates.admin_notes =
      body.admin_notes === null || body.admin_notes === ""
        ? ""
        : String(body.admin_notes).trim();
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contact_enquiries")
    .update(updates)
    .eq("id", id)
    .select("*, enquiry_items(*)")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
  }

  return NextResponse.json({ enquiry: data });
}
