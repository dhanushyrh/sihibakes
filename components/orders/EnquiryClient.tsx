"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { HeartDivider } from "@/components/landing/HeartDivider";
import { telHref } from "@/lib/storefront";
import type { StorefrontDetails } from "@/lib/storefront";
import { CheckCircle } from "lucide-react";

const TYPE_LABELS: Record<string, { title: string; description: string }> = {
  "kitty-party": {
    title: "Kitty Party enquiry",
    description: "Tell us about your gathering — guest count, date, and preferences.",
  },
  "pre-order": {
    title: "Pre-order enquiry",
    description: "Planning ahead? Share your occasion and what you'd like to order.",
  },
  general: {
    title: "General enquiry",
    description: "Ask us anything about our desserts, delivery, or custom orders.",
  },
};

export function EnquiryClient({ store }: { store: StorefrontDetails }) {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "general";
  const meta = TYPE_LABELS[type] ?? TYPE_LABELS.general;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <OrderFlowHeader title="Enquiry sent" backHref="/orders" />
        <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-12 text-center">
          <CheckCircle size={48} className="text-gold" />
          <h2 className="mt-4 font-display text-2xl font-semibold text-chocolate">
            Thank you!
          </h2>
          <p className="mt-2 text-sm text-chocolate/60">
            We&apos;ve received your enquiry and will get back to you soon.
          </p>
          {store.phone && (
            <a
              href={telHref(store.phone)}
              className="mt-6 text-sm font-medium text-chocolate underline"
            >
              Or call {store.phone}
            </a>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-8">
      <OrderFlowHeader title={meta.title} backHref="/orders" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <HeartDivider className="mb-5" />
        <p className="text-sm text-chocolate/60">{meta.description}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-chocolate/55">Your name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-chocolate/55">Phone</label>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-chocolate/55">Message</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none"
              placeholder="Date, quantity, preferences..."
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
          >
            {submitting ? "Sending..." : "Submit enquiry"}
          </button>
        </form>
      </main>
    </div>
  );
}
