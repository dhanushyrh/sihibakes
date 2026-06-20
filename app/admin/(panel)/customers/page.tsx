"use client";

import { useCallback, useEffect, useState } from "react";
import { CUSTOMERS_PAGE_SIZE } from "@/lib/constants";
import type { CustomerWithStats } from "@/lib/admin-customers-query";
import { CustomersTable } from "@/components/admin/customers/CustomersTable";
import { CustomerOrdersModal } from "@/components/admin/customers/CustomerOrdersModal";
import { Pagination } from "@/components/admin/orders/Pagination";
import { Search, Users } from "lucide-react";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithStats | null>(null);

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
    params.set("pageSize", String(CUSTOMERS_PAGE_SIZE));
    if (searchQuery) params.set("q", searchQuery);

    const res = await fetch(`/api/admin/customers?${params}`);
    const data = await res.json();

    if (!res.ok) {
      setLoadError(data.error ?? "Failed to load customers");
      setCustomers([]);
      setTotalCount(0);
    } else {
      setCustomers(data.customers ?? []);
      setTotalCount(data.totalCount ?? 0);
    }

    setLoading(false);
  }, [page, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(totalCount / CUSTOMERS_PAGE_SIZE));
  const hasFilters = searchQuery !== "";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
            Customers
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            {totalCount} customer{totalCount === 1 ? "" : "s"}
            {hasFilters ? " matching search" : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4B2C20]/40"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, phone, or email…"
            className="h-[42px] w-full rounded-xl border border-[#4B2C20]/10 bg-white py-0 pl-9 pr-4 text-sm text-[#4B2C20] placeholder:text-[#4B2C20]/40"
          />
        </div>
      </div>

      {loadError && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {loading ? (
        <p className="mt-12 text-center text-sm text-[#4B2C20]/50">Loading…</p>
      ) : customers.length === 0 ? (
        <div className="mt-12 rounded-2xl bg-white p-12 text-center ring-1 ring-[#4B2C20]/10">
          <Users className="mx-auto text-[#4B2C20]/30" size={40} />
          <p className="mt-4 font-medium text-[#4B2C20]">
            {hasFilters ? "No customers match your search" : "No customers yet"}
          </p>
          <p className="mt-1 text-sm text-[#4B2C20]/50">
            {hasFilters
              ? "Try a different name, phone, or email"
              : "Customers are added when orders are placed"}
          </p>
        </div>
      ) : (
        <>
          <CustomersTable
            customers={customers}
            onViewOrders={setSelectedCustomer}
          />
          <CustomerOrdersModal
            customer={selectedCustomer}
            onClose={() => setSelectedCustomer(null)}
          />
          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={CUSTOMERS_PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
