"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { EnquirySuccess } from "@/components/orders/EnquirySuccess";
import { KittyPartyEnquiryClient } from "@/components/orders/KittyPartyEnquiryClient";
import { HeartDivider } from "@/components/landing/HeartDivider";
import { IndianPhoneInput } from "@/components/store/IndianPhoneInput";
import { isValidIndianPhone } from "@/lib/checkout-validation";
import type { Product } from "@/lib/types";
import type { StorefrontDetails } from "@/lib/storefront";

const TYPE_LABELS: Record<string, { title: string; description: string }> = {
  "kitty-party": {
    title: "Kitty Party enquiry",
    description: "Pick your desserts, date, and notes — we'll get back to you on WhatsApp.",
  },
  general: {
    title: "General enquiry",
    description: "Ask us anything about our desserts, delivery, or custom orders.",
  },
};

const GENERAL_ENQUIRY_SUCCESS_MESSAGE =
  "Thanks for submitting — our team will get back to you over WhatsApp.";

function GeneralEnquiryForm({ store }: { store: StorefrontDetails }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const meta = TYPE_LABELS.general;

  const submitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      name.trim().length < 2 ||
      !isValidIndianPhone(phone) ||
      message.trim().length < 10
    ) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "general",
          name,
          phone,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not submit enquiry");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <EnquirySuccess
        store={store}
        description={GENERAL_ENQUIRY_SUCCESS_MESSAGE}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-8">
      <OrderFlowHeader title={meta.title} backHref="/orders" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <HeartDivider className="mb-5" />
        <p className="text-sm text-chocolate/60">{meta.description}</p>

        <form onSubmit={(e) => void submitEnquiry(e)} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-chocolate/55">Your name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none focus:border-chocolate/30"
            />
          </div>
          <div>
            <label className="text-xs text-chocolate/55">WhatsApp number</label>
            <IndianPhoneInput value={phone} onChange={setPhone} />
            <p className="mt-1 text-xs text-chocolate/50">
              We&apos;ll reach out to you on this number.
            </p>
          </div>
          <div>
            <label className="text-xs text-chocolate/55">Your message</label>
            <textarea
              required
              rows={4}
              minLength={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none focus:border-chocolate/30"
              placeholder="Tell us what you need..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={
              submitting ||
              name.trim().length < 2 ||
              !isValidIndianPhone(phone) ||
              message.trim().length < 10
            }
            className="w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
          >
            {submitting ? "Sending..." : "Submit enquiry"}
          </button>
        </form>
      </main>
    </div>
  );
}

export function EnquiryClient({
  store,
  products,
}: {
  store: StorefrontDetails;
  products: Product[];
}) {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "general";

  if (type === "kitty-party") {
    return <KittyPartyEnquiryClient store={store} products={products} />;
  }

  if (type === "pre-order") {
    return <GeneralEnquiryForm store={store} />;
  }

  return <GeneralEnquiryForm store={store} />;
}
