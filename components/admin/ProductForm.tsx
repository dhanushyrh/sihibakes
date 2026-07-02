"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product, Allergens, ProductTag } from "@/lib/types";
import { ALLERGEN_OPTIONS, TAG_OPTIONS } from "@/lib/constants";
import { formatCurrency } from "@/lib/delivery";
import {
  ArrowLeft,
  ImagePlus,
  Loader2,
  Upload,
  X,
} from "lucide-react";

const emptyAllergens: Allergens = {
  egg: false,
  dairy: false,
  gluten: false,
  nuts: false,
  soy: false,
};

const defaultProduct: Partial<Product> = {
  title: "",
  description: "",
  price_inr: undefined,
  discount_percent: null,
  image_path: null,
  serves: 1,
  allergens: emptyAllergens,
  tags: [],
  is_active: true,
  is_sold_out: false,
  daily_order_limit: null,
};

interface ProductFormProps {
  initial?: Partial<Product>;
  mode: "create" | "edit";
}

export function ProductForm({ initial, mode }: ProductFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState<Partial<Product>>({
    ...defaultProduct,
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const price = editing.price_inr ?? 0;
  const discount = editing.discount_percent ?? 0;
  const finalPrice = price * (1 - discount / 100);

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }

      setEditing((e) => ({ ...e, image_path: data.url as string }));
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadImage(file);
  };

  const toggleTag = (tag: ProductTag) => {
    setEditing((e) => {
      const tags = e?.tags ?? [];
      return {
        ...e,
        tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
      };
    });
  };

  const save = async () => {
    setError("");
    if (!editing.title?.trim()) {
      setError("Title is required");
      return;
    }
    if (!editing.price_inr || editing.price_inr <= 0) {
      setError("Enter a valid price");
      return;
    }
    if (!editing.description?.trim()) {
      setError("Description is required");
      return;
    }

    setSaving(true);
    const payload = {
      title: editing.title.trim(),
      description: editing.description.trim(),
      price_inr: editing.price_inr,
      discount_percent: editing.discount_percent ?? null,
      image_path: editing.image_path ?? null,
      serves: editing.serves ?? 1,
      allergens: editing.allergens ?? emptyAllergens,
      tags: editing.tags ?? [],
      is_active: editing.is_active ?? true,
      is_sold_out: editing.is_sold_out ?? false,
      daily_order_limit: null,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-[#4B2C20]/10 transition hover:bg-[#F5E6D3]"
        >
          <ArrowLeft size={18} className="text-[#4B2C20]" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#4B2C20]">
            {mode === "create" ? "Add product" : "Edit product"}
          </h1>
          <p className="text-sm text-[#4B2C20]/60">
            {mode === "create"
              ? "Create a new dessert listing for your menu"
              : `Editing ${editing.title}`}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* Preview column */}
        <div className="lg:col-span-2">
          <div className="sticky top-8 space-y-4">
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#4B2C20]/10">
              <div className="relative aspect-square bg-[#F5E6D3]">
                {editing.image_path ? (
                  <>
                    <Image
                      src={editing.image_path}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setEditing((e) => ({ ...e, image_path: null }))}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-[#4B2C20]/40">
                    <ImagePlus size={40} strokeWidth={1.5} />
                    <p className="mt-2 text-xs">Image preview</p>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium text-[#4B2C20]">
                  {editing.title || "Product title"}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-[#4B2C20]/60">
                  {editing.description || "Description will appear here"}
                </p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-[#4B2C20]">
                    {price > 0 ? formatCurrency(finalPrice) : "₹—"}
                  </span>
                  {discount > 0 && price > 0 && (
                    <span className="text-sm text-[#4B2C20]/40 line-through">
                      {formatCurrency(price)}
                    </span>
                  )}
                </div>
                {editing.tags && editing.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {editing.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#4B2C20] px-2 py-0.5 text-[10px] text-white"
                      >
                        {TAG_OPTIONS.find((t) => t.key === tag)?.label ?? tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
                dragOver
                  ? "border-[#4B2C20] bg-[#4B2C20]/5"
                  : "border-[#4B2C20]/20 bg-white"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {uploading ? (
                <Loader2 className="mx-auto animate-spin text-[#4B2C20]" size={24} />
              ) : (
                <>
                  <Upload className="mx-auto text-[#4B2C20]/40" size={24} />
                  <p className="mt-2 text-sm font-medium text-[#4B2C20]">
                    Drop image here
                  </p>
                  <p className="mt-1 text-xs text-[#4B2C20]/50">or</p>
                  <label className="mt-2 inline-block cursor-pointer rounded-full bg-[#4B2C20] px-4 py-2 text-xs font-medium text-white">
                    Browse files
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] && uploadImage(e.target.files[0])
                      }
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Form column */}
        <div className="space-y-6 lg:col-span-3">
          <section className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
            <h2 className="text-sm font-semibold text-[#4B2C20]">Basic details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-[#4B2C20]/60">
                  Title *
                </label>
                <input
                  value={editing.title ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, title: e.target.value })
                  }
                  placeholder="e.g. Classic Tiramisu"
                  className="mt-1.5 w-full rounded-xl border border-[#4B2C20]/10 bg-[#F5E6D3]/30 px-4 py-2.5 text-sm outline-none focus:border-[#4B2C20]/30"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#4B2C20]/60">
                    Description *
                  </label>
                  <span className="text-[10px] text-[#4B2C20]/40">
                    {(editing.description ?? "").length}/500
                  </span>
                </div>
                <textarea
                  value={editing.description ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      description: e.target.value.slice(0, 500),
                    })
                  }
                  placeholder="Describe ingredients, texture, and what makes it special..."
                  rows={4}
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#4B2C20]/10 bg-[#F5E6D3]/30 px-4 py-2.5 text-sm outline-none focus:border-[#4B2C20]/30"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
            <h2 className="text-sm font-semibold text-[#4B2C20]">Pricing</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-[#4B2C20]/60">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={editing.price_inr ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      price_inr: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#4B2C20]/10 bg-[#F5E6D3]/30 px-4 py-2.5 text-sm outline-none focus:border-[#4B2C20]/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#4B2C20]/60">
                  Discount %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.discount_percent ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      discount_percent: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  placeholder="0"
                  className="mt-1.5 w-full rounded-xl border border-[#4B2C20]/10 bg-[#F5E6D3]/30 px-4 py-2.5 text-sm outline-none focus:border-[#4B2C20]/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#4B2C20]/60">
                  Serves (people)
                </label>
                <input
                  type="number"
                  min={1}
                  value={editing.serves ?? 1}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      serves: Number(e.target.value) || 1,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-[#4B2C20]/10 bg-[#F5E6D3]/30 px-4 py-2.5 text-sm outline-none focus:border-[#4B2C20]/30"
                />
              </div>
            </div>
            {price > 0 && (
              <p className="mt-3 rounded-lg bg-[#F5E6D3]/50 px-3 py-2 text-xs text-[#4B2C20]/70">
                Customer pays{" "}
                <strong>{formatCurrency(finalPrice)}</strong>
                {discount > 0 && (
                  <>
                    {" "}
                    (save {formatCurrency(price - finalPrice)})
                  </>
                )}
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
            <h2 className="text-sm font-semibold text-[#4B2C20]">Tags</h2>
            <p className="mt-0.5 text-xs text-[#4B2C20]/50">
              Highlight on menu and homepage
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggleTag(t.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    editing.tags?.includes(t.key)
                      ? "bg-[#4B2C20] text-white"
                      : "bg-[#F5E6D3] text-[#4B2C20] hover:bg-[#4B2C20]/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
            <h2 className="text-sm font-semibold text-[#4B2C20]">Allergens</h2>
            <p className="mt-0.5 text-xs text-[#4B2C20]/50">
              Shown to customers on product page
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((a) => {
                const checked = editing.allergens?.[a.key] ?? false;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        allergens: {
                          ...(editing.allergens ?? emptyAllergens),
                          [a.key]: !checked,
                        },
                      })
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      checked
                        ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200"
                        : "bg-[#F5E6D3] text-[#4B2C20]/60"
                    }`}
                  >
                    {checked ? "Contains " : ""}
                    {a.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 ring-1 ring-[#4B2C20]/10">
            <h2 className="text-sm font-semibold text-[#4B2C20]">Availability</h2>
            <p className="mt-1 text-xs text-[#4B2C20]/50">
              Daily quantities are managed under Delivery &amp; Stock
            </p>
            <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl bg-[#F5E6D3]/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#4B2C20]">
                    Active on menu
                  </p>
                  <p className="text-xs text-[#4B2C20]/50">
                    Inactive products are hidden from customers
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={(e) =>
                    setEditing({ ...editing, is_active: e.target.checked })
                  }
                  className="h-5 w-5 rounded accent-[#4B2C20]"
                />
              </label>
            <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl bg-[#F5E6D3]/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[#4B2C20]">
                    Mark as sold out
                  </p>
                  <p className="text-xs text-[#4B2C20]/50">
                    Shows sold out on same-day and pre-order menus. Same-day
                    daily stock limits still apply separately.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={editing.is_sold_out ?? false}
                  onChange={(e) =>
                    setEditing({ ...editing, is_sold_out: e.target.checked })
                  }
                  className="h-5 w-5 rounded accent-[#4B2C20]"
                />
              </label>
          </section>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex gap-3 pb-8">
            <Link
              href="/admin/products"
              className="flex-1 rounded-full border border-[#4B2C20]/20 py-3 text-center text-sm font-medium text-[#4B2C20]"
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={saving || uploading}
              onClick={save}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#4B2C20] py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {mode === "create" ? "Publish product" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
