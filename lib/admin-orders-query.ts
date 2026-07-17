import type { SupabaseClient } from "@supabase/supabase-js";
import { ORDERS_PAGE_SIZE } from "@/lib/constants";
import { ADMIN_ORDERS_VISIBLE_OR } from "@/lib/offline-orders";
import type { Order } from "@/lib/types";
import {
  applyOrderFieldFilters,
  parseLegacyStatusFilter,
  parseOrderFieldFilters,
  type OrderFieldFilter,
} from "@/lib/admin-order-filters";

/** Orders list + table updates — includes line items for roster-style display. */
export const ADMIN_ORDER_LIST_SELECT =
  "*, order_items(*, products(title))";

/** Order detail page — includes unit pricing on nested products. */
export const ADMIN_ORDER_DETAIL_SELECT =
  "*, order_items(*, products(title, price_inr))";

export async function fetchAdminOrderById(
  admin: SupabaseClient,
  id: string,
  select = ADMIN_ORDER_DETAIL_SELECT
) {
  return admin.from("orders").select(select).eq("id", id).single();
}

/** Keep line items when a partial order payload omits the nested join. */
export function mergeAdminOrderUpdate(existing: Order, updated: Order): Order {
  return {
    ...existing,
    ...updated,
    order_items: updated.order_items ?? existing.order_items,
  };
}

export type AdminOrdersDateType = "delivery" | "placed";

export interface AdminOrdersQueryParams {
  q?: string;
  customerId?: string;
  /** @deprecated Use fieldFilters instead */
  status?: string[];
  fieldFilters?: OrderFieldFilter[];
  dateFrom?: string;
  dateTo?: string;
  dateType?: AdminOrdersDateType;
  page?: number;
  pageSize?: number;
  /** Sort by delivery slot window, then placed time (for single-day delivery views). */
  orderBySlot?: boolean;
}

function isDateQuery(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function sanitizeSearchTerm(term: string): string {
  return term.replace(/[%_]/g, "");
}

export function parseAdminOrdersQueryParams(
  searchParams: URLSearchParams
): AdminOrdersQueryParams {
  const statusRaw = searchParams.get("status");
  const filtersRaw = searchParams.get("filters");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Number(searchParams.get("pageSize") ?? ORDERS_PAGE_SIZE) || ORDERS_PAGE_SIZE)
  );
  const dateType = searchParams.get("dateType");
  const orderBySlot = searchParams.get("orderBySlot") === "1";

  const fieldFilters = parseOrderFieldFilters(filtersRaw);
  const legacyStatus = parseLegacyStatusFilter(statusRaw);
  const mergedFieldFilters =
    fieldFilters.length > 0
      ? fieldFilters
      : legacyStatus
        ? [legacyStatus]
        : undefined;

  return {
    q: searchParams.get("q")?.trim() || undefined,
    customerId: searchParams.get("customerId")?.trim() || undefined,
    fieldFilters: mergedFieldFilters,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    dateType: dateType === "placed" ? "placed" : "delivery",
    page,
    pageSize,
    orderBySlot,
  };
}

export async function queryAdminOrders(
  admin: SupabaseClient,
  params: AdminOrdersQueryParams
) {
  const {
    q,
    customerId,
    fieldFilters,
    dateFrom,
    dateTo,
    dateType = "delivery",
    page = 1,
    pageSize = ORDERS_PAGE_SIZE,
    orderBySlot = false,
  } = params;

  let query = admin
    .from("orders")
    .select(ADMIN_ORDER_LIST_SELECT, { count: "exact" })
    .or(ADMIN_ORDERS_VISIBLE_OR);

  if (orderBySlot) {
    query = query
      .order("delivery_window_start", { ascending: true })
      .order("created_at", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (customerId) {
    const { data: customer, error: customerError } = await admin
      .from("customers")
      .select("phone")
      .eq("id", customerId)
      .maybeSingle();

    if (customerError) {
      return { data: null, count: null, error: customerError };
    }

    if (!customer) {
      return { data: [], count: 0, error: null };
    }

    query = query.or(
      `customer_id.eq.${customerId},and(customer_id.is.null,phone.eq.${customer.phone})`
    );
  }

  if (fieldFilters?.length) {
    query = applyOrderFieldFilters(query, fieldFilters);
  }

  if (dateFrom || dateTo) {
    if (dateType === "delivery") {
      if (dateFrom) query = query.gte("delivery_date", dateFrom);
      if (dateTo) query = query.lte("delivery_date", dateTo);
    } else {
      if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999`);
    }
  }

  if (q) {
    if (isDateQuery(q)) {
      query = query.or(
        `delivery_date.eq.${q},and(created_at.gte.${q}T00:00:00,created_at.lte.${q}T23:59:59.999)`
      );
    } else {
      const term = sanitizeSearchTerm(q);
      query = query.or(
        `order_number.ilike.%${term}%,customer_name.ilike.%${term}%,phone.ilike.%${term}%`
      );
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return query.range(from, to);
}
