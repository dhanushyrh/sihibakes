import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseAdminCustomersQueryParams,
  queryAdminCustomers,
  type CustomerWithStats,
} from "@/lib/admin-customers-query";
import { isSupabaseConfigured } from "@/lib/mock-data";
import { CustomersPageClient } from "./CustomersPageClient";
import AdminCustomersLoading from "./loading";

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

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;
  let initialCustomers: CustomerWithStats[] = [];
  let initialTotalCount = 0;

  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const queryParams = parseAdminCustomersQueryParams(
      toURLSearchParams(resolvedParams)
    );
    const { data, count, error } = await queryAdminCustomers(admin, queryParams);

    if (!error) {
      initialCustomers = data ?? [];
      initialTotalCount = count ?? 0;
    }
  }

  return (
    <Suspense fallback={<AdminCustomersLoading />}>
      <CustomersPageClient
        initialCustomers={initialCustomers}
        initialTotalCount={initialTotalCount}
      />
    </Suspense>
  );
}
