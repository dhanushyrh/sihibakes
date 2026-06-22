"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ORDERS_PAGE_SIZE } from "@/lib/constants";
import type { Order, OrderStatus } from "@/lib/types";
import { OrderStatusMultiSelect } from "@/components/admin/orders/OrderStatusMultiSelect";
import { OrderStatusChangeModal } from "@/components/admin/orders/OrderStatusChangeModal";
import { OrderCancelModal } from "@/components/admin/orders/OrderCancelModal";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";
import { Pagination } from "@/components/admin/orders/Pagination";
import type { OrderStatusUpdatePayload } from "@/lib/order-status-update";
import {
  submitOrderCancel,
  type OrderCancelPayload,
} from "@/lib/admin-order-cancel";
import { ArrowLeft, Download, Search, ShoppingBag, X } from "lucide-react";

type DateFilterType = "delivery" | "placed";

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdFromUrl = searchParams.get("customerId") ?? "";
  const customerNameFromUrl = searchParams.get("customerName") ?? "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilters, setStatusFilters] = useState<OrderStatus[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("delivery");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
  const [statusModalTarget, setStatusModalTarget] = useState<OrderStatus | null>(
    null
  );
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (customerIdFromUrl) {
      setCustomerFilter({
        id: customerIdFromUrl,
        name: customerNameFromUrl || "Customer",
      });
      setPage(1);
    } else {
      setCustomerFilter(null);
    }
  }, [customerIdFromUrl, customerNameFromUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearCustomerFilter = () => {
    setCustomerFilter(null);
    setPage(1);
    router.replace("/admin/orders");
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(ORDERS_PAGE_SIZE));
    params.set("dateType", dateFilterType);
    if (customerFilter?.id) params.set("customerId", customerFilter.id);
    if (searchQuery) params.set("q", searchQuery);
    if (statusFilters.length) params.set("status", statusFilters.join(","));
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      setLoadError(data.error ?? "Failed to load orders");
      setOrders([]);
      setTotalCount(0);
    } else {
      setOrders((data.orders ?? []) as Order[]);
      setTotalCount(data.totalCount ?? 0);
    }

    setLoading(false);
  }, [
    statusFilters,
    dateFrom,
    dateTo,
    dateFilterType,
    searchQuery,
    page,
    customerFilter?.id,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const closeStatusModal = () => {
    if (updatingId) return;
    setStatusModalOrder(null);
    setStatusModalTarget(null);
  };

  const closeCancelModal = () => {
    if (updatingId) return;
    setCancelModalOrder(null);
  };

  const requestStatusChange = (orderId: string, status: OrderStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.status === status) return;
    if (status === "cancelled") {
      setCancelModalOrder(order);
      return;
    }
    setStatusModalOrder(order);
    setStatusModalTarget(status);
  };

  const confirmStatusChange = async (payload: OrderStatusUpdatePayload) => {
    if (!statusModalOrder) return;
    const orderId = statusModalOrder.id;

    setUpdatingId(orderId);
    setStatusError(null);

    const body: Record<string, string> = { status: payload.status };
    if (payload.dispatchMode) {
      body.dispatch_mode = payload.dispatchMode;
    }
    if (payload.delivery) {
      Object.assign(body, payload.delivery);
    }

    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setStatusError(data.error ?? "Failed to update status");
    } else {
      const updated = data as Order;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updated : o))
      );
      if (
        statusFilters.length > 0 &&
        !statusFilters.includes(payload.status)
      ) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setTotalCount((c) => Math.max(0, c - 1));
      }
      closeStatusModal();
    }

    setUpdatingId(null);
  };

  const confirmCancel = async (payload: OrderCancelPayload) => {
    if (!cancelModalOrder) return;
    const orderId = cancelModalOrder.id;

    setUpdatingId(orderId);
    setStatusError(null);

    const result = await submitOrderCancel(
      orderId,
      payload,
      cancelModalOrder.payment_status
    );

    if ("error" in result) {
      setStatusError(result.error);
    } else {
      const updated = result.order as Order;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (statusFilters.length > 0 && !statusFilters.includes("cancelled")) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setTotalCount((c) => Math.max(0, c - 1));
      }
      closeCancelModal();
    }

    setUpdatingId(null);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ORDERS_PAGE_SIZE));
  const hasFilters =
    statusFilters.length > 0 ||
    dateFrom !== "" ||
    dateTo !== "" ||
    searchQuery !== "" ||
    customerFilter !== null;

  const clearDateRange = () => {
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {customerFilter ? (
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-1 text-sm text-[#4B2C20]/60 hover:text-[#4B2C20]"
            >
              <ArrowLeft size={14} /> Customers
            </Link>
          ) : null}
          <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
            {customerFilter ? `${customerFilter.name}'s orders` : "Orders"}
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            {totalCount} order{totalCount === 1 ? "" : "s"}
            {hasFilters && !customerFilter ? " matching filters" : ""}
            {customerFilter ? " for this customer" : ""}
          </p>
        </div>
        {!customerFilter && (
          <Link
            href="/admin/orders/roster"
            className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-[#4B2C20] px-4 text-sm font-medium text-white transition hover:bg-[#3d2319]"
          >
            <Download size={16} />
            Download roster
          </Link>
        )}
      </div>

      {customerFilter && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#F5E6D3]/50 px-4 py-3">
          <p className="text-sm text-[#4B2C20]">
            Showing orders for{" "}
            <span className="font-medium">{customerFilter.name}</span>
          </p>
          <button
            type="button"
            onClick={clearCustomerFilter}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#4B2C20]/60 hover:text-[#4B2C20]"
          >
            <X size={14} />
            Show all orders
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <label
            htmlFor="orders-search"
            className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50"
          >
            Search
          </label>
          <div className="relative mt-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4B2C20]/40"
            />
            <input
              id="orders-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Order, customer, phone, date…"
              className="h-[42px] w-full rounded-xl border border-[#4B2C20]/10 bg-white py-0 pl-9 pr-4 text-sm text-[#4B2C20] placeholder:text-[#4B2C20]/40"
            />
          </div>
        </div>
        <OrderStatusMultiSelect
          compact
          selected={statusFilters}
          onChange={(next) => {
            setStatusFilters(next);
            setPage(1);
          }}
        />
        <div>
          <label
            htmlFor="orders-date-type"
            className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50"
          >
            Date type
          </label>
          <select
            id="orders-date-type"
            value={dateFilterType}
            onChange={(e) => {
              setDateFilterType(e.target.value as DateFilterType);
              setPage(1);
            }}
            className="mt-1 block h-[42px] rounded-xl border border-[#4B2C20]/10 bg-white px-3 text-sm text-[#4B2C20]"
          >
            <option value="delivery">Delivery</option>
            <option value="placed">Placed</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="orders-date-from"
            className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50"
          >
            From
          </label>
          <input
            id="orders-date-from"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="mt-1 block h-[42px] rounded-xl border border-[#4B2C20]/10 bg-white px-3 text-sm text-[#4B2C20]"
          />
        </div>
        <div>
          <label
            htmlFor="orders-date-to"
            className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50"
          >
            To
          </label>
          <input
            id="orders-date-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="mt-1 block h-[42px] rounded-xl border border-[#4B2C20]/10 bg-white px-3 text-sm text-[#4B2C20]"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={clearDateRange}
            className="h-[42px] shrink-0 rounded-xl px-3 text-xs text-[#4B2C20]/60 hover:text-[#4B2C20]"
          >
            Clear dates
          </button>
        )}
      </div>

      {(statusError || loadError) && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {statusError ?? loadError}
        </p>
      )}

      {loading ? (
        <p className="mt-12 text-center text-sm text-[#4B2C20]/50">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="mt-12 rounded-2xl bg-white p-12 text-center ring-1 ring-[#4B2C20]/10">
          <ShoppingBag className="mx-auto text-[#4B2C20]/30" size={40} />
          <p className="mt-4 font-medium text-[#4B2C20]">
            {hasFilters ? "No orders match your filters" : "No orders yet"}
          </p>
          <p className="mt-1 text-sm text-[#4B2C20]/50">
            {hasFilters
              ? "Try adjusting search or filter criteria"
              : "Paid orders will appear here once customers complete checkout"}
          </p>
        </div>
      ) : (
        <>
          <OrdersTable
            orders={orders}
            updatingId={updatingId}
            onStatusRequest={requestStatusChange}
          />

          <OrderStatusChangeModal
            order={statusModalOrder}
            targetStatus={statusModalTarget}
            saving={updatingId === statusModalOrder?.id}
            onClose={closeStatusModal}
            onConfirm={confirmStatusChange}
          />

          <OrderCancelModal
            order={cancelModalOrder}
            saving={updatingId === cancelModalOrder?.id}
            onClose={closeCancelModal}
            onConfirm={confirmCancel}
          />

          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={ORDERS_PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
