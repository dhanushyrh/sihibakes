"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type {
  LocationCaptureLead,
  LocationCaptureLeadStatus,
} from "@/lib/market-analysis";
import { formatCurrency } from "@/lib/delivery";
import { formatDisplayPhone } from "@/lib/storefront";
import { Pagination } from "@/components/admin/orders/Pagination";

type LeadFilter = "all" | "abandoned" | "completed";

interface LocationCaptureLeadsTableProps {
  leads: LocationCaptureLead[];
}

const PAGE_SIZE = 15;

const STATUS_LABELS: Record<LocationCaptureLeadStatus, string> = {
  completed: "Completed",
  unpaid_order: "Unpaid order",
  abandoned: "Abandoned",
  in_progress: "In progress",
};

const STATUS_STYLES: Record<LocationCaptureLeadStatus, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  unpaid_order: "bg-amber-50 text-amber-800",
  abandoned: "bg-red-50 text-red-700",
  in_progress: "bg-blue-50 text-blue-700",
};

function formatAmount(value: number | null): string {
  return value == null ? "—" : formatCurrency(value);
}

function matchesFilter(
  lead: LocationCaptureLead,
  filter: LeadFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "completed") return lead.status === "completed";
  return lead.status === "abandoned" || lead.status === "unpaid_order";
}

export function LocationCaptureLeadsTable({
  leads,
}: LocationCaptureLeadsTableProps) {
  const [filter, setFilter] = useState<LeadFilter>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => leads.filter((lead) => matchesFilter(lead, filter)),
    [leads, filter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [filter, leads]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const filters: { id: LeadFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "abandoned", label: "Abandoned" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#4B2C20]">
            Location capture leads
          </h3>
          <p className="mt-0.5 text-xs text-[#4B2C20]/50">
            Users who pinned a delivery location — phone, cart value, and
            delivery fee quoted
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full px-3 py-1 text-[10px] font-medium transition ${
                filter === id
                  ? "bg-[#4B2C20] text-white"
                  : "bg-[#F5E6D3] text-[#4B2C20]/70 hover:text-[#4B2C20]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {leads.length === 0 ? (
        <p className="mt-6 text-sm text-[#4B2C20]/45">
          No location captures in this period.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-[#4B2C20]/45">
          No leads match this filter.
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#4B2C20]/10 text-[10px] uppercase tracking-wide text-[#4B2C20]/45">
                  <th className="pb-2 pr-3 font-medium">When</th>
                  <th className="pb-2 pr-3 font-medium">Phone</th>
                  <th className="pb-2 pr-3 font-medium">Name</th>
                  <th className="pb-2 pr-3 font-medium">Cart</th>
                  <th className="pb-2 pr-3 font-medium">Delivery</th>
                  <th className="pb-2 pr-3 font-medium">Est. total</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 font-medium">Items</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((lead) => (
                  <tr
                    key={lead.sessionId}
                    className="border-b border-[#4B2C20]/5 last:border-0"
                  >
                    <td className="py-2.5 pr-3 whitespace-nowrap text-[#4B2C20]/75">
                      {format(parseISO(lead.locationMarkedAt), "d MMM, h:mm a")}
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-[#4B2C20]">
                      {lead.phone ? formatDisplayPhone(lead.phone) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-[#4B2C20]/75">
                      {lead.fullName?.trim() || "—"}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-[#4B2C20]/75">
                      {formatAmount(lead.cartValueInr)}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-[#4B2C20]/75">
                      {formatAmount(lead.deliveryFeeInr)}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium text-[#4B2C20]">
                      {formatAmount(lead.estimatedTotalInr)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[lead.status]}`}
                      >
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-[#4B2C20]/60">
                      {lead.topItems.length > 0 ? lead.topItems.join(", ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
