"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Copy, MessageCircle } from "lucide-react";
import { enquiryShortId } from "@/lib/enquiries";
import { ENQUIRY_STATUS_OPTIONS } from "@/lib/constants";
import type { ContactEnquiry, EnquiryStatus } from "@/lib/types";
import { whatsappHref } from "@/lib/storefront";

export default function AdminEnquiryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [enquiry, setEnquiry] = useState<ContactEnquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<EnquiryStatus>("new");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/enquiries/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load enquiry");
      setEnquiry(null);
    } else {
      const e = data.enquiry as ContactEnquiry;
      setEnquiry(e);
      setStatus(e.status);
      setAdminNotes(e.admin_notes ?? "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (updates: { status?: EnquiryStatus; admin_notes?: string }) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setEnquiry(data.enquiry);
      setStatus(data.enquiry.status);
      setAdminNotes(data.enquiry.admin_notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const copyPhone = async () => {
    if (!enquiry?.phone) return;
    await navigator.clipboard.writeText(enquiry.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappMessage =
    enquiry?.type === "kitty_party"
      ? `Hi ${enquiry.name}, thanks for your kitty party enquiry! We'd love to help with your order.`
      : `Hi ${enquiry?.name}, thanks for reaching out to Sihi Bakes!`;

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-sm text-[#4B2C20]/50">Loading enquiry...</p>
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">{error ?? "Enquiry not found"}</p>
        <Link href="/admin/enquiries" className="mt-4 inline-block text-sm underline">
          Back to enquiries
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <Link
        href="/admin/enquiries"
        className="inline-flex items-center gap-2 text-sm text-[#4B2C20]/60 hover:text-[#4B2C20]"
      >
        <ArrowLeft size={16} />
        Back to enquiries
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[#4B2C20]">
            Enquiry #{enquiryShortId(enquiry.id)}
          </h1>
          <p className="mt-1 text-sm text-[#4B2C20]/50">
            Received {format(new Date(enquiry.created_at), "d MMM yyyy, h:mm a")}
          </p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white p-6 ring-1 ring-[#4B2C20]/10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#4B2C20]/50">
              Customer
            </h2>
            <p className="mt-3 font-medium text-[#4B2C20]">{enquiry.name}</p>
            <p className="text-sm text-[#4B2C20]/60">+91 {enquiry.phone}</p>
            {enquiry.phone_verified_at && (
              <p className="mt-1 text-xs text-green-700">
                WhatsApp verified{" "}
                {format(new Date(enquiry.phone_verified_at), "d MMM, h:mm a")}
              </p>
            )}
          </section>

          {enquiry.type === "kitty_party" && (
            <>
              <section className="rounded-2xl bg-white p-6 ring-1 ring-[#4B2C20]/10">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[#4B2C20]/50">
                  Event
                </h2>
                <p className="mt-3 text-[#4B2C20]">
                  {enquiry.event_date
                    ? format(new Date(`${enquiry.event_date}T12:00:00`), "EEEE, d MMMM yyyy")
                    : "—"}
                  {enquiry.event_time ? ` at ${enquiry.event_time}` : ""}
                </p>
              </section>

              <section className="rounded-2xl bg-white p-6 ring-1 ring-[#4B2C20]/10">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-[#4B2C20]/50">
                  Products
                </h2>
                <ul className="mt-3 space-y-2">
                  {(enquiry.enquiry_items ?? []).map((item) => (
                    <li
                      key={item.id}
                      className="text-sm text-[#4B2C20]"
                    >
                      {item.product_name}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          <section className="rounded-2xl bg-white p-6 ring-1 ring-[#4B2C20]/10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#4B2C20]/50">
              {enquiry.type === "kitty_party" ? "Notes" : "Message"}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#4B2C20]/80">
              {enquiry.message}
            </p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl bg-white p-6 ring-1 ring-[#4B2C20]/10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#4B2C20]/50">
              Status
            </h2>
            <select
              value={status}
              onChange={(e) => {
                const next = e.target.value as EnquiryStatus;
                setStatus(next);
                void save({ status: next });
              }}
              disabled={saving}
              className="mt-3 w-full rounded-xl border border-[#4B2C20]/10 bg-[#F5E6D3]/30 px-3 py-2.5 text-sm outline-none"
            >
              {ENQUIRY_STATUS_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-[#4B2C20]/10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#4B2C20]/50">
              Internal notes
            </h2>
            <textarea
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Notes for your team..."
              className="mt-3 w-full resize-none rounded-xl border border-[#4B2C20]/10 bg-[#F5E6D3]/30 px-3 py-2.5 text-sm outline-none"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void save({ admin_notes: adminNotes })}
              className="mt-3 w-full rounded-full bg-[#4B2C20] py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save notes"}
            </button>
          </section>

          <section className="rounded-2xl bg-white p-6 ring-1 ring-[#4B2C20]/10">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#4B2C20]/50">
              Quick actions
            </h2>
            <div className="mt-3 space-y-2">
              <a
                href={whatsappHref(enquiry.phone, whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366]/10 py-2.5 text-sm font-medium text-[#128C7E]"
              >
                <MessageCircle size={16} />
                Open WhatsApp
              </a>
              <button
                type="button"
                onClick={() => void copyPhone()}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#4B2C20]/15 py-2.5 text-sm text-[#4B2C20]"
              >
                <Copy size={16} />
                {copied ? "Copied!" : "Copy phone"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
