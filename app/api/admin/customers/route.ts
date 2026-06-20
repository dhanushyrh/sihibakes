import { NextResponse } from "next/server";
import { CUSTOMERS_PAGE_SIZE } from "@/lib/constants";
import { requireAdmin } from "@/lib/admin-auth";
import {
  parseAdminCustomersQueryParams,
  queryAdminCustomers,
} from "@/lib/admin-customers-query";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const params = parseAdminCustomersQueryParams(new URL(request.url).searchParams);
  const admin = createAdminClient();

  const { data, count, error } = await queryAdminCustomers(admin, params);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? CUSTOMERS_PAGE_SIZE;
  const totalCount = count ?? 0;

  return NextResponse.json({
    customers: data ?? [],
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  });
}
