"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/delivery";
import { AvailabilitySwitch } from "@/components/admin/AvailabilitySwitch";
import { ProductGridSkeleton } from "@/components/admin/ui/AdminPageSkeleton";
import { Plus, Pencil, Trash2, Package } from "lucide-react";

type ActiveFilter = "all" | "active" | "inactive";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActiveFilter>("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "active") return products.filter((p) => p.is_active);
    if (filter === "inactive") return products.filter((p) => !p.is_active);
    return products;
  }, [products, filter]);

  const activeCount = products.filter((p) => p.is_active).length;

  const toggleAvailability = async (id: string, is_active: boolean) => {
    setTogglingId(id);
    await supabase
      .from("products")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id);
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active } : p))
    );
    setTogglingId(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  };

  const filters: { key: ActiveFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "inactive", label: "Inactive" },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#4B2C20]">Products</h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            {products.length} total · {activeCount} active
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#4B2C20] px-5 py-2.5 text-sm font-medium text-white"
        >
          <Plus size={16} /> Add product
        </Link>
      </div>

      <div className="mt-4 flex gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              filter === key
                ? "bg-[#4B2C20] text-white"
                : "bg-white text-[#4B2C20] ring-1 ring-[#4B2C20]/10"
            }`}
          >
            {label}
            {key === "active" && ` (${activeCount})`}
            {key === "inactive" && ` (${products.length - activeCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6">
          <ProductGridSkeleton count={6} />
        </div>
      ) : products.length === 0 ? (
        <div className="mt-12 rounded-2xl bg-white p-12 text-center ring-1 ring-[#4B2C20]/10">
          <Package className="mx-auto text-[#4B2C20]/30" size={40} />
          <p className="mt-4 font-medium text-[#4B2C20]">No products yet</p>
          <p className="mt-1 text-sm text-[#4B2C20]/50">
            Add your first dessert to start selling
          </p>
          <Link
            href="/admin/products/new"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#4B2C20] px-5 py-2.5 text-sm text-white"
          >
            <Plus size={16} /> Add product
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-12 text-center text-sm text-[#4B2C20]/50">
          No products match this filter.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <article
              key={p.id}
              className={`flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10 ${
                !p.is_active ? "opacity-90" : ""
              }`}
            >
              <div className="relative aspect-[16/10] bg-[#F5E6D3]">
                <Image
                  src={p.image_path || "/hero-tiramisu.png"}
                  alt={p.title}
                  fill
                  className={`object-cover ${!p.is_active ? "grayscale-[30%]" : ""}`}
                />
                {!p.is_active && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                    Sold out
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-medium text-[#4B2C20]">{p.title}</h3>
                <p className="mt-0.5 text-xs text-[#4B2C20]/50">
                  {formatCurrency(p.price_inr)} · Serves {p.serves}
                </p>

                <div className="mt-3">
                  <AvailabilitySwitch
                    active={p.is_active}
                    productTitle={p.title}
                    disabled={togglingId === p.id}
                    onToggle={(next) => toggleAvailability(p.id, next)}
                  />
                </div>

                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#F5E6D3] py-2 text-xs font-medium text-[#4B2C20]"
                  >
                    <Pencil size={14} /> Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="flex items-center justify-center rounded-full px-3 py-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
