import type { SupabaseClient } from "@supabase/supabase-js";

export async function getWhatsAppUnreadTotal(
  admin: SupabaseClient
): Promise<number> {
  const { data, error } = await admin
    .from("whatsapp_conversations")
    .select("unread_count");

  if (error) {
    console.error("getWhatsAppUnreadTotal failed:", error);
    return 0;
  }

  return (data ?? []).reduce((sum, row) => sum + (row.unread_count ?? 0), 0);
}
