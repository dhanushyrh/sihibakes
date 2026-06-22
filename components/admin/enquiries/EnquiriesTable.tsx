"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import { enquiryShortId, formatEnquirySummary } from "@/lib/enquiries";
import type { ContactEnquiry, EnquiryStatus, EnquiryType } from "@/lib/types";
import { whatsappHref } from "@/lib/storefront";

const TYPE_STYLES: Record<EnquiryType, string> = {
  kitty_party: "bg-gold/20 text-chocolate ring-gold/40",
  general: "bg-[#F5E6D3] text-chocolate ring-chocolate/15",
  landing: "bg-white text-chocolate ring-chocolate/20",
  pre_order: "bg-kraft/30 text-chocolate ring-chocolate/15",
};

const TYPE_LABELS: Record<EnquiryType, string> = {
  kitty_party: "Kitty Party",
  general: "General",
  landing: "Landing",
  pre_order: "Pre-order",
};

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  new: "bg-blue-50 text-blue-800 ring-blue-200",
  in_progress: "bg-amber-50 text-amber-800 ring-amber-200",
  replied: "bg-green-50 text-green-800 ring-green-200",
  closed: "bg-[#4B2C20]/8 text-[#4B2C20]/60 ring-[#4B2C20]/10",
};

const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  in_progress: "In progress",
  replied: "Replied",
  closed: "Closed",
};

export function EnquiriesTable({ enquiries }: { enquiries: ContactEnquiry[] }) {
  if (enquiries.length === 0) {
    return (
      <div className="mt-6 rounded-2xl bg-white p-12 text-center ring-1 ring-[#4B2C20]/10">
        <p className="text-sm text-[#4B2C20]/50">No enquiries yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-[#4B2C20]/10 bg-[#F5E6D3]/30 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Enquiry
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Customer
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Summary
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-[#4B2C20]">
                Received
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#4B2C20]">
                <span className="sr-only">View</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {enquiries.map((enquiry) => (
              <tr
                key={enquiry.id}
                className="border-b border-[#4B2C20]/5 transition last:border-0 hover:bg-[#F5E6D3]/20"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/enquiries/${enquiry.id}`}
                    className="font-medium text-[#4B2C20] hover:underline"
                  >
                    #{enquiryShortId(enquiry.id)}
                  </Link>
                  <span
                    className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${TYPE_STYLES[enquiry.type]}`}
                  >
                    {TYPE_LABELS[enquiry.type]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-[#4B2C20]">{enquiry.name}</p>
                  <a
                    href={whatsappHref(enquiry.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#4B2C20]/50 hover:underline"
                  >
                    {enquiry.phone}
                  </a>
                </td>
                <td className="max-w-[240px] px-4 py-3 text-[#4B2C20]/70">
                  {formatEnquirySummary(enquiry)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${STATUS_STYLES[enquiry.status]}`}
                  >
                    {STATUS_LABELS[enquiry.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#4B2C20]/60">
                  {format(new Date(enquiry.created_at), "d MMM yyyy, h:mm a")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/enquiries/${enquiry.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#4B2C20]/50 hover:bg-[#F5E6D3]/50"
                    aria-label="View enquiry"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
