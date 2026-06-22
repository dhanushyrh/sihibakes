import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listActiveDeliveryVendors } from "@/lib/delivery-vendors";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const admin = createAdminClient();
    const vendors = await listActiveDeliveryVendors(admin);
    return NextResponse.json({ vendors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load vendors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
