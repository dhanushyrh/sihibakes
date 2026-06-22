import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  parseAdminEnquiriesQueryParams,
  queryAdminEnquiries,
} from "@/lib/enquiries";
import { ENQUIRIES_PAGE_SIZE } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const params = parseAdminEnquiriesQueryParams(new URL(request.url).searchParams);
  const admin = createAdminClient();
  const { data, count, error } = await queryAdminEnquiries(admin, params);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? ENQUIRIES_PAGE_SIZE;
  const totalCount = count ?? 0;

  return NextResponse.json({
    enquiries: data ?? [],
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  });
}
