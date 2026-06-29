"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getTodayDate } from "@/lib/inventory";
import { reviewImageSrc } from "@/lib/reviews";
import type { CustomerReview } from "@/lib/types";
import { ListSkeleton } from "@/components/admin/ui/AdminPageSkeleton";
import { ImagePlus, Loader2, Plus, Star, X } from "lucide-react";

const emptyReview = (sortOrder: number): Partial<CustomerReview> => ({
  name: "",
  area: "",
  product: "",
  rating: 5,
  quote: "",
  image_path: null,
  reviewed_at: getTodayDate(),
  sort_order: sortOrder,
  is_active: true,
});

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<CustomerReview> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const supabase = createClient();

  const load = async () => {
    const { data, error } = await supabase
      .from("customer_reviews")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("reviewed_at", { ascending: false });

    if (!error) {
      setReviews((data ?? []) as CustomerReview[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const activeCount = useMemo(
    () => reviews.filter((review) => review.is_active).length,
    [reviews]
  );

  const openNew = () => {
    const nextOrder =
      reviews.reduce((max, review) => Math.max(max, review.sort_order), 0) + 1;
    setEditing(emptyReview(nextOrder));
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (review: CustomerReview) => {
    setEditing({ ...review });
    setFormError(null);
    setShowForm(true);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setFormError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Upload failed");
        return;
      }

      setEditing((current) => ({
        ...current,
        image_path: data.url as string,
      }));
    } catch {
      setFormError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!editing?.name?.trim()) {
      setFormError("Customer name is required.");
      return;
    }
    if (!editing.quote?.trim()) {
      setFormError("Review text is required.");
      return;
    }
    if (!editing.reviewed_at) {
      setFormError("Review date is required.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const payload = {
      name: editing.name.trim(),
      area: editing.area?.trim() ?? "",
      product: editing.product?.trim() ?? "",
      rating: Math.min(5, Math.max(1, editing.rating ?? 5)),
      quote: editing.quote.trim(),
      image_path: editing.image_path?.trim() || null,
      reviewed_at: editing.reviewed_at,
      sort_order: editing.sort_order ?? reviews.length + 1,
      is_active: editing.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    const { error } = editing.id
      ? await supabase.from("customer_reviews").update(payload).eq("id", editing.id)
      : await supabase.from("customer_reviews").insert(payload);

    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setShowForm(false);
    setEditing(null);
    load();
  };

  const toggleActive = async (review: CustomerReview) => {
    await supabase
      .from("customer_reviews")
      .update({
        is_active: !review.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", review.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await supabase.from("customer_reviews").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
            Reviews
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/60">
            {activeCount} live on the orders page and landing section
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4B2C20] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#3d2319]"
        >
          <Plus size={16} />
          Add review
        </button>
      </div>

      {loading ? (
        <div className="mt-6">
          <ListSkeleton count={5} />
        </div>
      ) : reviews.length === 0 ? (
        <p className="mt-8 text-sm text-[#4B2C20]/50">
          No reviews yet. Add your first customer story.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#4B2C20]/8 sm:flex-row sm:items-start"
            >
              <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-[#f2ebe3]">
                {review.image_path ? (
                  <Image
                    src={reviewImageSrc(review.image_path)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#4B2C20]/30">
                    <ImagePlus size={20} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium text-[#4B2C20]">{review.name}</h2>
                  {!review.is_active && (
                    <span className="rounded-full bg-[#4B2C20]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#4B2C20]/60">
                      Hidden
                    </span>
                  )}
                  <span className="text-xs text-[#4B2C20]/45">
                    {review.reviewed_at}
                  </span>
                </div>
                {review.product && (
                  <p className="mt-0.5 text-xs text-[#4B2C20]/55">{review.product}</p>
                )}
                <p className="mt-2 line-clamp-2 text-sm text-[#4B2C20]/70">
                  &ldquo;{review.quote}&rdquo;
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                <button
                  type="button"
                  onClick={() => toggleActive(review)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    review.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[#4B2C20]/8 text-[#4B2C20]/60"
                  }`}
                >
                  {review.is_active ? "Live" : "Hidden"}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(review)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#4B2C20] ring-1 ring-[#4B2C20]/15 transition hover:bg-[#4B2C20]/5"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(review.id)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-[#4B2C20]">
                {editing.id ? "Edit review" : "New review"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="text-[#4B2C20]/50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-[#4B2C20]/70">Name</span>
                <input
                  value={editing.name ?? ""}
                  onChange={(e) =>
                    setEditing((current) => ({ ...current, name: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-[#4B2C20]/15 px-3 py-2 text-sm"
                  placeholder="Ananya R."
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-[#4B2C20]/70">Area</span>
                  <input
                    value={editing.area ?? ""}
                    onChange={(e) =>
                      setEditing((current) => ({ ...current, area: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#4B2C20]/15 px-3 py-2 text-sm"
                    placeholder="Indiranagar"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-[#4B2C20]/70">Product</span>
                  <input
                    value={editing.product ?? ""}
                    onChange={(e) =>
                      setEditing((current) => ({ ...current, product: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#4B2C20]/15 px-3 py-2 text-sm"
                    placeholder="Classic Tiramisu"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-[#4B2C20]/70">Review</span>
                <textarea
                  value={editing.quote ?? ""}
                  onChange={(e) =>
                    setEditing((current) => ({ ...current, quote: e.target.value }))
                  }
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-[#4B2C20]/15 px-3 py-2 text-sm"
                  placeholder="What did they love about it?"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-[#4B2C20]/70">Date</span>
                  <input
                    type="date"
                    value={editing.reviewed_at ?? ""}
                    onChange={(e) =>
                      setEditing((current) => ({
                        ...current,
                        reviewed_at: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#4B2C20]/15 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-[#4B2C20]/70">Sort order</span>
                  <input
                    type="number"
                    min={0}
                    value={editing.sort_order ?? 0}
                    onChange={(e) =>
                      setEditing((current) => ({
                        ...current,
                        sort_order: Number(e.target.value),
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#4B2C20]/15 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div>
                <span className="text-xs font-medium text-[#4B2C20]/70">Rating</span>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setEditing((current) => ({ ...current, rating: value }))
                      }
                      className="rounded p-1"
                    >
                      <Star
                        size={20}
                        className={
                          value <= (editing.rating ?? 5)
                            ? "fill-[#c5a059] text-[#c5a059]"
                            : "text-[#4B2C20]/20"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-[#4B2C20]/70">Photo</span>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative h-16 w-24 overflow-hidden rounded-lg bg-[#f2ebe3]">
                    {editing.image_path ? (
                      <Image
                        src={reviewImageSrc(editing.image_path)}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#4B2C20]/30">
                        <ImagePlus size={18} />
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer rounded-lg bg-[#4B2C20]/8 px-3 py-2 text-xs font-medium text-[#4B2C20]">
                    {uploading ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 size={14} className="animate-spin" />
                        Uploading…
                      </span>
                    ) : (
                      "Upload image"
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImage(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || uploading}
                  className="flex-1 rounded-xl bg-[#4B2C20] py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save review"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm text-[#4B2C20]/70 ring-1 ring-[#4B2C20]/15"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
