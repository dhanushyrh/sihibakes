import type { SupabaseClient } from "@supabase/supabase-js";
import { CUSTOMERS_PAGE_SIZE } from "@/lib/constants";
import type { Customer } from "@/lib/types";

export interface CustomerWithStats extends Customer {
  order_count: number;
  order_total_inr: number;
}

export interface AdminCustomersQueryParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_]/g, "");
}

export function parseAdminCustomersQueryParams(
  searchParams: URLSearchParams
): AdminCustomersQueryParams {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(
    50,
    Math.max(
      1,
      Number(searchParams.get("pageSize") ?? CUSTOMERS_PAGE_SIZE) ||
        CUSTOMERS_PAGE_SIZE
    )
  );

  return {
    q: searchParams.get("q")?.trim() || undefined,
    page,
    pageSize,
  };
}

function aggregateOrderStats(
  customers: Customer[],
  orders: { customer_id: string | null; phone: string; total_inr: number }[]
) {
  const phoneToCustomerId = new Map(customers.map((c) => [c.phone, c.id]));
  const stats = new Map<string, { order_count: number; order_total_inr: number }>();

  for (const customer of customers) {
    stats.set(customer.id, { order_count: 0, order_total_inr: 0 });
  }

  for (const order of orders) {
    const customerId =
      order.customer_id ?? phoneToCustomerId.get(order.phone) ?? null;
    if (!customerId || !stats.has(customerId)) continue;

    const current = stats.get(customerId)!;
    current.order_count += 1;
    current.order_total_inr += order.total_inr;
  }

  return stats;
}

export async function queryAdminCustomers(
  admin: SupabaseClient,
  params: AdminCustomersQueryParams
) {
  const { q, page = 1, pageSize = CUSTOMERS_PAGE_SIZE } = params;

  let customerQuery = admin
    .from("customers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q) {
    const term = sanitizeSearchTerm(q);
    customerQuery = customerQuery.or(
      `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: customers, count, error } = await customerQuery.range(from, to);

  if (error) {
    return { data: null, count: 0, error };
  }

  const customerList = (customers ?? []) as Customer[];

  if (customerList.length === 0) {
    return { data: [], count: count ?? 0, error: null };
  }

  const customerIds = customerList.map((c) => c.id);
  const phones = customerList.map((c) => c.phone);

  const [{ data: byCustomerId, error: byIdError }, { data: byPhone, error: byPhoneError }] =
    await Promise.all([
      admin
        .from("orders")
        .select("customer_id, phone, total_inr")
        .eq("payment_status", "paid")
        .in("customer_id", customerIds),
      admin
        .from("orders")
        .select("customer_id, phone, total_inr")
        .eq("payment_status", "paid")
        .is("customer_id", null)
        .in("phone", phones),
    ]);

  const ordersError = byIdError ?? byPhoneError;
  if (ordersError) {
    return { data: null, count: 0, error: ordersError };
  }

  const orders = [...(byCustomerId ?? []), ...(byPhone ?? [])];

  const stats = aggregateOrderStats(customerList, orders ?? []);

  const data: CustomerWithStats[] = customerList.map((customer) => {
    const s = stats.get(customer.id) ?? { order_count: 0, order_total_inr: 0 };
    return {
      ...customer,
      order_count: s.order_count,
      order_total_inr: s.order_total_inr,
    };
  });

  return { data, count: count ?? 0, error: null };
}
