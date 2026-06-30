import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminNotificationFeed } from "@/lib/admin-notifications-feed";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const feed = await getAdminNotificationFeed(admin);

  return NextResponse.json(feed);
}
