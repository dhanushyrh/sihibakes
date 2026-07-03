import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseAdminOrdersQueryParams,
  queryAdminOrders,
} from "@/lib/admin-orders-query";
import { isSupabaseConfigured } from "@/lib/mock-data";
import type { Order } from "@/lib/types";
import { OrdersPageClient } from "./OrdersPageClient";
import AdminOrdersLoading from "./loading";

export const dynamic = "force-dynamic";

function toURLSearchParams(
  params: Record<string, string | string[] | undefined>
): URLSearchParams {
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") urlParams.set(key, value);
    else if (Array.isArray(value) && value[0]) urlParams.set(key, value[0]);
  }
  return urlParams;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;
  let initialOrders: Order[] = [];
  let initialTotalCount = 0;

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const queryParams = parseAdminOrdersQueryParams(
      toURLSearchParams(resolvedParams)
    );
    const { data, count, error } = await queryAdminOrders(admin, queryParams);

    if (!error) {
      initialOrders = (data ?? []) as Order[];
      initialTotalCount = count ?? 0;
    }
  }

  return (
    <Suspense fallback={<AdminOrdersLoading />}>
      <OrdersPageClient
        initialOrders={initialOrders}
        initialTotalCount={initialTotalCount}
      />
    </Suspense>
  );
}
