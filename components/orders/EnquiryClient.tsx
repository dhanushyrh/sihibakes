"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageCircle, PartyPopper, type LucideIcon } from "lucide-react";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { EnquirySuccess } from "@/components/orders/EnquirySuccess";
import { KittyPartyEnquiryClient } from "@/components/orders/KittyPartyEnquiryClient";
import { HeartDivider } from "@/components/landing/HeartDivider";
import { IndianPhoneInput } from "@/components/store/IndianPhoneInput";
import { PhoneOtpVerification } from "@/components/store/PhoneOtpVerification";
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

const ENQUIRY_TYPE_OPTIONS = [
  {
    id: "kitty-party",
    title: "Kitty Party / Bulk Order",
    subtitle: "Desserts for gatherings, parties, and larger orders",
    icon: PartyPopper,
    href: "/orders/enquiry?type=kitty-party",
    accent: "gold" as const,
    cta: "Plan a bulk order",
  },
  {
    id: "general",
    title: "General Enquiry",
    subtitle: "Questions, custom requests, delivery help",
    icon: MessageCircle,
    href: "/orders/enquiry?type=general",
    accent: "white" as const,
    cta: "Ask a question",
  },
] as const;

function EnquiryTypeCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  href,
  cta,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: "white" | "gold";
  href: string;
  cta: string;
}) {
  const accentStyles =
    accent === "gold"
      ? "bg-gold text-chocolate ring-gold/30"
      : "bg-white text-chocolate ring-chocolate/15";

  return (
    <Link
      href={href}
      className={`group block w-full rounded-2xl p-4 text-left transition active:scale-[0.99] ${accentStyles} shadow-sm ring-1 hover:shadow-md`}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/10">
          <Icon size={22} strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold leading-tight">{title}</p>
          <p className="mt-1 text-xs opacity-80">{subtitle}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.15em] opacity-90">
            {cta}
            <span className="transition group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function EnquiryTypeChooser() {
  return (
    <div className="flex min-h-screen flex-col pb-[env(safe-area-inset-bottom)]">
      <OrderFlowHeader title="Enquiry" backHref="/orders" />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <div className="text-center">
          <HeartDivider className="mb-4" />
          <h1 className="font-display text-[clamp(1.35rem,4.5vw,1.75rem)] font-semibold leading-snug text-chocolate">
            What would you like to enquire about?
          </h1>
          <p className="mt-2 text-sm text-chocolate/55">
            Choose the enquiry type so we can ask the right details.
          </p>
        </div>

        <div className="mt-8 flex flex-1 flex-col gap-3">
          {ENQUIRY_TYPE_OPTIONS.map((option) => (
            <EnquiryTypeCard
              key={option.id}
              title={option.title}
              subtitle={option.subtitle}
              icon={option.icon}
              accent={option.accent}
              href={option.href}
              cta={option.cta}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function GeneralEnquiryForm({ store }: { store: StorefrontDetails }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [otpVerified, setOtpVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const meta = TYPE_LABELS.general;

  const submitEnquiry = async () => {
    if (!otpVerified) {
      setError("Verify your phone number first");
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

  if (step === "verify") {
    return (
      <div className="flex min-h-screen flex-col pb-8">
        <OrderFlowHeader title={meta.title} backHref="/orders/enquiry" />

        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
          <HeartDivider className="mb-5" />
          <h2 className="font-display text-lg font-semibold text-chocolate">
            Verify your number
          </h2>
          <p className="mt-1 text-sm text-chocolate/60">
            Confirm +91 {phone} to submit your enquiry.
          </p>

          <div className="mt-4 rounded-xl bg-cream/50 p-4 text-sm text-chocolate/70">
            <p className="font-medium text-chocolate">{name}</p>
            <p className="mt-2">{message}</p>
          </div>

          <div className="mt-6">
            <PhoneOtpVerification
              phone={phone}
              source="general_enquiry"
              onVerified={() => setOtpVerified(true)}
              onError={setError}
            />
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setOtpVerified(false);
                setError("");
              }}
              className="flex-1 rounded-full border border-chocolate/20 py-3.5 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!otpVerified || submitting}
              onClick={() => void submitEnquiry()}
              className="flex-1 rounded-full bg-chocolate py-3.5 text-sm font-medium text-cream disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Submit enquiry"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-8">
      <OrderFlowHeader title={meta.title} backHref="/orders/enquiry" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <HeartDivider className="mb-5" />
        <p className="text-sm text-chocolate/60">{meta.description}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              name.trim().length >= 2 &&
              isValidIndianPhone(phone) &&
              message.trim().length >= 10
            ) {
              setStep("verify");
            }
          }}
          className="mt-6 space-y-4"
        >
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
              name.trim().length < 2 ||
              !isValidIndianPhone(phone) ||
              message.trim().length < 10
            }
            className="w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
          >
            Continue
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
  const type = searchParams.get("type");

  if (!type) {
    return <EnquiryTypeChooser />;
  }

  if (type === "kitty-party") {
    return <KittyPartyEnquiryClient store={store} products={products} />;
  }

  if (type === "general" || type === "pre-order") {
    return <GeneralEnquiryForm store={store} />;
  }

  return <EnquiryTypeChooser />;
}
