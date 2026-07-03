"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ENQUIRIES_PAGE_SIZE, ENQUIRY_STATUS_OPTIONS, ENQUIRY_TYPE_OPTIONS } from "@/lib/constants";
import type { ContactEnquiry, EnquiryStatus, EnquiryType } from "@/lib/types";
import { EnquiriesTable } from "@/components/admin/enquiries/EnquiriesTable";
import { Pagination } from "@/components/admin/orders/Pagination";
import { TableSkeleton } from "@/components/admin/ui/TableSkeleton";
import { ArrowLeft, MessageSquare, Search } from "lucide-react";

type TypeFilter = EnquiryType | "all";
type StatusFilter = EnquiryStatus | "all";

const filterSelectClass =
  "mt-1 block h-[42px] w-full min-w-0 rounded-xl border border-[#4B2C20]/10 bg-white px-3 text-sm text-[#4B2C20]";

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<ContactEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(ENQUIRIES_PAGE_SIZE));
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (searchQuery) params.set("q", searchQuery);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    const res = await fetch(`/api/admin/enquiries?${params.toString()}`);
    const data = await res.json();

    if (!res.ok) {
      setLoadError(data.error ?? "Failed to load enquiries");
      setEnquiries([]);
      setTotalCount(0);
    } else {
      setEnquiries((data.enquiries ?? []) as ContactEnquiry[]);
      setTotalCount(data.totalCount ?? 0);
    }

    setLoading(false);
  }, [typeFilter, statusFilter, searchQuery, dateFrom, dateTo, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams();
      params.set("unread", "1");
      params.set("pageSize", "1");
      const res = await fetch(`/api/admin/enquiries?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setNewCount(data.totalCount ?? 0);
    })();
  }, [enquiries]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ENQUIRIES_PAGE_SIZE));
  const hasFilters =
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    searchQuery !== "";

  const clearDateRange = () => {
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-[#4B2C20]/10 md:hidden"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare size={22} className="text-[#4B2C20]" />
            <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
              Enquiries
            </h1>
            {newCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                {newCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#4B2C20]/50">
            {totalCount} enquir{totalCount === 1 ? "y" : "ies"}
            {hasFilters ? " matching filters" : ""}
            {" · "}Kitty party, general, and contact form submissions
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
        <div className="col-span-2 min-w-0 sm:col-span-1 sm:min-w-[12rem] sm:flex-1">
          <label
            htmlFor="enquiries-search"
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
              id="enquiries-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name or phone…"
              className="h-[42px] w-full rounded-xl border border-[#4B2C20]/10 bg-white py-0 pl-9 pr-4 text-sm text-[#4B2C20] placeholder:text-[#4B2C20]/40"
            />
          </div>
        </div>
        <div className="col-span-1 min-w-0">
          <label
            htmlFor="enquiries-type"
            className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50"
          >
            Type
          </label>
          <select
            id="enquiries-type"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as TypeFilter);
              setPage(1);
            }}
            className={filterSelectClass}
          >
            <option value="all">All types</option>
            {ENQUIRY_TYPE_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-1 min-w-0">
          <label
            htmlFor="enquiries-status"
            className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50"
          >
            Status
          </label>
          <select
            id="enquiries-status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className={filterSelectClass}
          >
            <option value="all">All statuses</option>
            {ENQUIRY_STATUS_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-1 min-w-0">
          <label
            htmlFor="enquiries-date-from"
            className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50"
          >
            From
          </label>
          <input
            id="enquiries-date-from"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className={filterSelectClass}
          />
        </div>
        <div className="col-span-1 min-w-0">
          <label
            htmlFor="enquiries-date-to"
            className="text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/50"
          >
            To
          </label>
          <input
            id="enquiries-date-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className={filterSelectClass}
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={clearDateRange}
            className="col-span-2 h-[42px] shrink-0 rounded-xl px-3 text-xs text-[#4B2C20]/60 hover:text-[#4B2C20] sm:col-span-1"
          >
            Clear dates
          </button>
        )}
      </div>

      {loadError && (
        <p className="mt-4 text-sm text-red-600">{loadError}</p>
      )}

      {loading ? (
        <div className="mt-6">
          <TableSkeleton rows={8} columns={5} />
        </div>
      ) : (
        <EnquiriesTable enquiries={enquiries} />
      )}

      <div className="mt-6">
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={ENQUIRIES_PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
