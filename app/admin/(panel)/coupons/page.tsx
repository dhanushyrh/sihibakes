"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Coupon, CouponType } from "@/lib/types";
import { COUPON_TYPE_OPTIONS } from "@/lib/constants";
import { CouponCard } from "@/components/admin/coupons/CouponCard";
import { Plus, Ticket } from "lucide-react";

type ActiveFilter = "all" | "active" | "inactive";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActiveFilter>("all");
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    setCoupons((data ?? []) as Coupon[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const activeCount = coupons.filter((c) => c.is_active).length;

  const filtered = useMemo(() => {
    if (filter === "active") return coupons.filter((c) => c.is_active);
    if (filter === "inactive") return coupons.filter((c) => !c.is_active);
    return coupons;
  }, [coupons, filter]);

  const save = async () => {
    if (!editing?.code) return;
    const payload = {
      code: editing.code.toUpperCase(),
      type: editing.type ?? "fixed_subtotal",
      value_inr: editing.value_inr ?? 0,
      min_subtotal_inr: editing.min_subtotal_inr ?? 0,
      first_order_only: editing.first_order_only ?? false,
      is_active: editing.is_active ?? true,
      valid_from: editing.valid_from ?? null,
      valid_until: editing.valid_until ?? null,
    };
    if (editing.id) {
      await supabase.from("coupons").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("coupons").insert(payload);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
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
          <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
            Coupons
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            {coupons.length} total · {activeCount} active
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing({ type: "fixed_subtotal", is_active: true });
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#4B2C20] px-5 py-2.5 text-sm font-medium text-white"
        >
          <Plus size={16} /> Add coupon
        </button>
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
            {key === "inactive" && ` (${coupons.length - activeCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-12 text-center text-sm text-[#4B2C20]/50">Loading…</p>
      ) : coupons.length === 0 ? (
        <div className="mt-12 rounded-2xl bg-white p-12 text-center ring-1 ring-[#4B2C20]/10">
          <Ticket className="mx-auto text-[#4B2C20]/30" size={40} />
          <p className="mt-4 font-medium text-[#4B2C20]">No coupons yet</p>
          <p className="mt-1 text-sm text-[#4B2C20]/50">
            Create a discount code to offer customers at checkout
          </p>
          <button
            type="button"
            onClick={() => {
              setEditing({ type: "fixed_subtotal", is_active: true });
              setShowForm(true);
            }}
            className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-[#4B2C20] px-5 py-2.5 text-sm text-white"
          >
            <Plus size={16} /> Add coupon
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-12 text-center text-sm text-[#4B2C20]/50">
          No coupons match this filter.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((coupon) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              onEdit={() => {
                setEditing(coupon);
                setShowForm(true);
              }}
              onDelete={() => remove(coupon.id)}
            />
          ))}
        </div>
      )}

      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="font-serif text-lg font-semibold text-[#4B2C20]">
              {editing.id ? "Edit coupon" : "New coupon"}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                placeholder="Code"
                value={editing.code ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, code: e.target.value.toUpperCase() })
                }
                className="w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm uppercase text-[#4B2C20]"
              />
              <select
                value={editing.type ?? "fixed_subtotal"}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    type: e.target.value as CouponType,
                  })
                }
                className="w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
              >
                {COUPON_TYPE_OPTIONS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Value (₹ or %)"
                value={editing.value_inr ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, value_inr: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
              />
              <input
                type="number"
                placeholder="Min subtotal (₹)"
                value={editing.min_subtotal_inr ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    min_subtotal_inr: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-[#4B2C20]/10 px-3 py-2 text-sm text-[#4B2C20]"
              />
              <label className="flex items-center gap-2 text-sm text-[#4B2C20]">
                <input
                  type="checkbox"
                  checked={editing.first_order_only ?? false}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      first_order_only: e.target.checked,
                    })
                  }
                />
                First order only
              </label>
              <label className="flex items-center gap-2 text-sm text-[#4B2C20]">
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) =>
                    setEditing({ ...editing, is_active: e.target.checked })
                  }
                />
                Active
              </label>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="flex-1 rounded-full border border-[#4B2C20]/10 py-2.5 text-sm text-[#4B2C20]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="flex-1 rounded-full bg-[#4B2C20] py-2.5 text-sm text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
