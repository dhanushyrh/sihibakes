"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/delivery";
import { orderShortId } from "@/lib/order-badges";
import { formatOrderItems } from "@/lib/order-roster";
import type { CustomerWithStats } from "@/lib/admin-customers-query";
import { OrderStatusBadge } from "@/components/admin/orders/OrderBadges";
import type { Order } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ChevronRight, Loader2, ShoppingBag, X } from "lucide-react";

interface CustomerOrdersModalProps {
  customer: CustomerWithStats | null;
  onClose: () => void;
}

export function CustomerOrdersModal({
  customer,
  onClose,
}: CustomerOrdersModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!customer) return;

    setLoading(true);
    setError(null);

    const pageSize = Math.min(100, Math.max(customer.order_count, 1));
    const params = new URLSearchParams({
      customerId: customer.id,
      page: "1",
      pageSize: String(pageSize),
    });

    const res = await fetch(`/api/admin/orders?${params}`);
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to load orders");
      setOrders([]);
    } else {
      setOrders((data.orders ?? []) as Order[]);
    }

    setLoading(false);
  }, [customer]);

  useEffect(() => {
    if (customer) {
      loadOrders();
    } else {
      setOrders([]);
      setError(null);
    }
  }, [customer, loadOrders]);

  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#4B2C20]/10 px-5 py-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[#4B2C20]">
              {customer.name}&apos;s orders
            </h2>
            <p className="mt-0.5 text-sm text-[#4B2C20]/60">
              {customer.phone}
              {customer.email ? ` · ${customer.email}` : ""}
            </p>
            <p className="mt-1 text-xs text-[#4B2C20]/50">
              {customer.order_count} paid order
              {customer.order_count === 1 ? "" : "s"} ·{" "}
              {formatCurrency(customer.order_total_inr)} total
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#4B2C20]/50 hover:bg-[#F5E6D3]/50 hover:text-[#4B2C20]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                size={24}
                className="animate-spin text-[#4B2C20]/40"
              />
            </div>
          ) : error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <ShoppingBag className="mx-auto text-[#4B2C20]/30" size={36} />
              <p className="mt-3 text-sm text-[#4B2C20]/60">
                No paid orders for this customer yet.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-xl bg-[#F5E6D3]/25 p-4 ring-1 ring-[#4B2C20]/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-[#4B2C20] hover:underline"
                      >
                        #{orderShortId(order.order_number)}
                      </Link>
                      <p className="mt-1 text-xs text-[#4B2C20]/60">
                        Placed{" "}
                        {format(parseISO(order.created_at), "d MMM yyyy, h:mm a")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#4B2C20]">
                        {formatCurrency(order.total_inr)}
                      </p>
                      <div className="mt-1">
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#4B2C20]/70">
                    <span>
                      Delivery:{" "}
                      {format(parseISO(order.delivery_date), "d MMM yyyy")} ·{" "}
                      {order.delivery_window_start?.slice(0, 5)} –{" "}
                      {order.delivery_window_end?.slice(0, 5)}
                    </span>
                  </div>

                  {order.order_items?.length ? (
                    <p className="mt-2 text-xs leading-relaxed text-[#4B2C20]/60">
                      {formatOrderItems(order.order_items)}
                    </p>
                  ) : null}

                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="mt-3 inline-flex items-center gap-0.5 text-xs font-medium text-[#4B2C20]/50 hover:text-[#4B2C20]"
                  >
                    View details
                    <ChevronRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
