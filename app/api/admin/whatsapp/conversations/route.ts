import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { WHATSAPP_CONVERSATIONS_PAGE_SIZE } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { queryAdminConversations } from "@/lib/whatsapp/conversations";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    50,
    Math.max(
      1,
      Number(url.searchParams.get("pageSize") ?? WHATSAPP_CONVERSATIONS_PAGE_SIZE) ||
        WHATSAPP_CONVERSATIONS_PAGE_SIZE
    )
  );
  const q = url.searchParams.get("q") ?? undefined;
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam === "open" || statusParam === "closed" ? statusParam : "all";

  const admin = createAdminClient();
  const { data, count, error } = await queryAdminConversations(admin, {
    page,
    pageSize,
    q,
    status,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalCount = count ?? 0;

  return NextResponse.json({
    conversations: data,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  });
}
