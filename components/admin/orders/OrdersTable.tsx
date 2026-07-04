"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatCurrency } from "@/lib/delivery";
import { orderShortId } from "@/lib/order-badges";
import {
  formatDeliveryWindow,
  formatOrderItems,
} from "@/lib/order-roster";
import { OrderStatusSelect } from "@/components/admin/orders/OrderStatusSelect";
import type { Order, OrderStatus } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ChevronRight, Clock, Loader2 } from "lucide-react";

interface OrdersTableProps {
  orders: Order[];
  updatingId: string | null;
  onStatusRequest: (orderId: string, status: OrderStatus) => void;
  groupBySlot?: boolean;
}

function OrderCard({
  order,
  isUpdating,
  onStatusRequest,
}: {
  order: Order;
  isUpdating: boolean;
  onStatusRequest: (orderId: string, status: OrderStatus) => void;
}) {
  return (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-[#4B2C20]/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/admin/orders/${order.id}`}
            title={order.order_number}
            className="font-medium text-[#4B2C20] hover:underline"
          >
            #{orderShortId(order.order_number)}
          </Link>
          <p className="mt-1 font-medium text-[#4B2C20]">{order.customer_name}</p>
          <p className="text-xs text-[#4B2C20]/50">{order.phone}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold text-[#4B2C20]">
            {formatCurrency(order.total_inr)}
          </p>
          <Link
            href={`/admin/orders/${order.id}`}
            className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-[#4B2C20]/50 hover:text-[#4B2C20]"
          >
            View
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-[#4B2C20]/70">
        <p>
          <span className="font-medium text-[#4B2C20]/50">Placed · </span>
          {format(parseISO(order.created_at), "d MMM yyyy, h:mm a")}
        </p>
        <p>
          <span className="font-medium text-[#4B2C20]/50">Delivery · </span>
          {format(parseISO(order.delivery_date), "d MMM yyyy")} ·{" "}
          {order.delivery_window_start?.slice(0, 5)} –{" "}
          {order.delivery_window_end?.slice(0, 5)}
        </p>
      </div>

      {order.order_items?.length ? (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#4B2C20]/60">
          {formatOrderItems(order.order_items)}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <OrderStatusSelect
            value={order.status}
            paymentStatus={order.payment_status}
            disabled={isUpdating}
            fullWidth
            onRequestChange={(status) => onStatusRequest(order.id, status)}
          />
        </div>
        {isUpdating && (
          <Loader2 size={16} className="shrink-0 animate-spin text-[#4B2C20]/40" />
        )}
      </div>
    </li>
  );
}

export function OrdersTable({
  orders,
  updatingId,
  onStatusRequest,
  groupBySlot = false,
}: OrdersTableProps) {
  const slotSections = useMemo(() => {
    if (!groupBySlot) return null;
    const groups = new Map<string, Order[]>();

    for (const order of orders) {
      const key = `${order.delivery_window_start}|${order.delivery_window_end}`;
      const list = groups.get(key) ?? [];
      list.push(order);
      groups.set(key, list);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, slotOrders]) => {
        const [windowStart, windowEnd] = key.split("|");
        return {
          key,
          label: formatDeliveryWindow(windowStart, windowEnd),
          orders: slotOrders,
        };
      });
  }, [groupBySlot, orders]);

  const renderMobileList = (list: Order[]) => (
    <ul className="space-y-3 md:hidden">
      {list.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          isUpdating={updatingId === order.id}
          onStatusRequest={onStatusRequest}
        />
      ))}
    </ul>
  );

  const renderDesktopTable = (list: Order[]) => (
    <div className="hidden overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10 md:block">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-[#4B2C20]/10 bg-[#F5E6D3]/30 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Order
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Customer
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Items
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Placed
              </th>
              {!groupBySlot && (
                <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                  Delivery
                </th>
              )}
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#4B2C20]">
                Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#4B2C20]">
                <span className="sr-only">View</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((order) => {
              const isUpdating = updatingId === order.id;

              return (
                <tr
                  key={order.id}
                  className="border-b border-[#4B2C20]/5 transition last:border-0 hover:bg-[#F5E6D3]/20"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      title={order.order_number}
                      className="font-medium text-[#4B2C20] hover:underline"
                    >
                      #{orderShortId(order.order_number)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#4B2C20]">
                      {order.customer_name}
                    </p>
                    <p className="text-xs text-[#4B2C20]/50">{order.phone}</p>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-[#4B2C20]/70">
                    {order.order_items?.length ? (
                      <p className="line-clamp-2 text-xs leading-relaxed">
                        {formatOrderItems(order.order_items)}
                      </p>
                    ) : (
                      <span className="text-xs text-[#4B2C20]/40">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#4B2C20]/70">
                    <p>{format(parseISO(order.created_at), "d MMM yyyy")}</p>
                    <p className="text-xs text-[#4B2C20]/40">
                      {format(parseISO(order.created_at), "h:mm a")}
                    </p>
                  </td>
                  {!groupBySlot && (
                    <td className="whitespace-nowrap px-4 py-3 text-[#4B2C20]/70">
                      <p>{format(parseISO(order.delivery_date), "d MMM yyyy")}</p>
                      <p className="text-xs text-[#4B2C20]/40">
                        {order.delivery_window_start?.slice(0, 5)} –{" "}
                        {order.delivery_window_end?.slice(0, 5)}
                      </p>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="inline-flex items-center gap-2">
                      <OrderStatusSelect
                        value={order.status}
                        paymentStatus={order.payment_status}
                        disabled={isUpdating}
                        onRequestChange={(status) =>
                          onStatusRequest(order.id, status)
                        }
                      />
                      {isUpdating && (
                        <Loader2
                          size={14}
                          className="animate-spin text-[#4B2C20]/40"
                        />
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#4B2C20]">
                    {formatCurrency(order.total_inr)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center gap-0.5 text-xs font-medium text-[#4B2C20]/50 hover:text-[#4B2C20]"
                    >
                      View
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (slotSections) {
    return (
      <div className="mt-6 space-y-8">
        {slotSections.map(({ key, label, orders: slotOrders }) => (
          <section key={key}>
            <div className="flex items-center gap-2 rounded-xl bg-[#F5E6D3]/60 px-4 py-3 ring-1 ring-[#4B2C20]/10">
              <Clock size={16} className="shrink-0 text-[#4B2C20]/60" />
              <h2 className="text-sm font-semibold text-[#4B2C20]">{label}</h2>
              <span className="text-xs text-[#4B2C20]/50">
                {slotOrders.length} order{slotOrders.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-3">
              {renderMobileList(slotOrders)}
              {renderDesktopTable(slotOrders)}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mt-6">{renderMobileList(orders)}</div>
      <div className="mt-6">{renderDesktopTable(orders)}</div>
    </>
  );
}
