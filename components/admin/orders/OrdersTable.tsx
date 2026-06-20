"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/delivery";
import { orderShortId } from "@/lib/order-badges";
import { formatOrderItems } from "@/lib/order-roster";
import { OrderStatusSelect } from "@/components/admin/orders/OrderStatusSelect";
import type { Order, OrderStatus } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ChevronRight, Loader2 } from "lucide-react";

interface OrdersTableProps {
  orders: Order[];
  updatingId: string | null;
  onStatusRequest: (orderId: string, status: OrderStatus) => void;
}

export function OrdersTable({
  orders,
  updatingId,
  onStatusRequest,
}: OrdersTableProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10">
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
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Delivery
              </th>
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
            {orders.map((order) => {
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
                  <td className="whitespace-nowrap px-4 py-3 text-[#4B2C20]/70">
                    <p>{format(parseISO(order.delivery_date), "d MMM yyyy")}</p>
                    <p className="text-xs text-[#4B2C20]/40">
                      {order.delivery_window_start?.slice(0, 5)} –{" "}
                      {order.delivery_window_end?.slice(0, 5)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative inline-flex items-center">
                      <OrderStatusSelect
                        value={order.status}
                        disabled={isUpdating}
                        onRequestChange={(status) =>
                          onStatusRequest(order.id, status)
                        }
                      />
                      {isUpdating && (
                        <Loader2
                          size={14}
                          className="absolute -right-5 animate-spin text-[#4B2C20]/40"
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
}
