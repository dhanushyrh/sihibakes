"use client";

import { formatCurrency } from "@/lib/delivery";
import type { CustomerWithStats } from "@/lib/admin-customers-query";
import { format, parseISO } from "date-fns";
import { ChevronRight, Mail, Phone, User } from "lucide-react";

interface CustomersTableProps {
  customers: CustomerWithStats[];
  onViewOrders: (customer: CustomerWithStats) => void;
}

export function CustomersTable({
  customers,
  onViewOrders,
}: CustomersTableProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[#4B2C20]/10 bg-[#F5E6D3]/30 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Customer
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Contact
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#4B2C20]">
                Orders
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#4B2C20]">
                Total spent
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Member since
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#4B2C20]">
                <span className="sr-only">View orders</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-[#4B2C20]/5 last:border-0"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User size={14} className="shrink-0 text-[#4B2C20]/40" />
                    <span className="font-medium text-[#4B2C20]">
                      {customer.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1 text-[#4B2C20]/80">
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="shrink-0 text-[#4B2C20]/40" />
                      <a
                        href={`tel:${customer.phone}`}
                        className="hover:underline"
                      >
                        {customer.phone}
                      </a>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-1.5 text-xs text-[#4B2C20]/60">
                        <Mail size={12} className="shrink-0 text-[#4B2C20]/40" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[#4B2C20]">
                  {customer.order_count}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-[#4B2C20]">
                  {formatCurrency(customer.order_total_inr)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[#4B2C20]/70">
                  {format(parseISO(customer.created_at), "d MMM yyyy")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onViewOrders(customer)}
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-[#4B2C20]/50 hover:text-[#4B2C20]"
                  >
                    Orders
                    <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
