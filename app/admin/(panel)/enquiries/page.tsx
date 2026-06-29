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

export default function AdminEnquiriesPage() {
  const [enquiries, setEnquiries] = useState<ContactEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilters, setStatusFilters] = useState<EnquiryStatus[]>([]);
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
    if (statusFilters.length) params.set("status", statusFilters.join(","));
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
  }, [typeFilter, statusFilters, searchQuery, dateFrom, dateTo, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams();
      params.set("status", "new");
      params.set("pageSize", "1");
      const res = await fetch(`/api/admin/enquiries?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setNewCount(data.totalCount ?? 0);
    })();
  }, [enquiries]);

  const toggleStatus = (status: EnquiryStatus) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ENQUIRIES_PAGE_SIZE));

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
                {newCount} new
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#4B2C20]/50">
            Kitty party, general, and contact form submissions
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["all", ...ENQUIRY_TYPE_OPTIONS.map((t) => t.key)] as TypeFilter[]).map(
          (type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setTypeFilter(type);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                typeFilter === type
                  ? "bg-[#4B2C20] text-white"
                  : "bg-white text-[#4B2C20] ring-1 ring-[#4B2C20]/10"
              }`}
            >
              {type === "all"
                ? "All"
                : ENQUIRY_TYPE_OPTIONS.find((t) => t.key === type)?.label}
            </button>
          )
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {ENQUIRY_STATUS_OPTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => toggleStatus(s.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              statusFilters.includes(s.key)
                ? "bg-[#4B2C20] text-white"
                : "bg-white text-[#4B2C20] ring-1 ring-[#4B2C20]/10"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4B2C20]/40"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-sm ring-1 ring-[#4B2C20]/10 outline-none focus:ring-[#4B2C20]/25"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-[#4B2C20]/10"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-[#4B2C20]/10"
        />
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
