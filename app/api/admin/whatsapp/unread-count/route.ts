import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppUnreadTotal } from "@/lib/whatsapp/unread";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const admin = createAdminClient();
  const unreadCount = await getWhatsAppUnreadTotal(admin);

  return NextResponse.json({ unreadCount });
}
