import { NextResponse } from "next/server";
import { ORDERS_PAGE_SIZE } from "@/lib/constants";
import { requireAdmin } from "@/lib/admin-auth";
import {
  parseAdminOrdersQueryParams,
  queryAdminOrders,
} from "@/lib/admin-orders-query";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const params = parseAdminOrdersQueryParams(new URL(request.url).searchParams);
  const admin = createAdminClient();

  const { data, count, error } = await queryAdminOrders(admin, params);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? ORDERS_PAGE_SIZE;
  const totalCount = count ?? 0;

  return NextResponse.json({
    orders: data ?? [],
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  });
}
