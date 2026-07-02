"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { EnquirySuccess } from "@/components/orders/EnquirySuccess";
import { IndianPhoneInput } from "@/components/store/IndianPhoneInput";
import { PhoneOtpVerification } from "@/components/store/PhoneOtpVerification";
import { DatePicker } from "@/components/store/DatePicker";
import { HeartDivider } from "@/components/landing/HeartDivider";
import { isMenuProduct } from "@/lib/cart-products";
import { isValidIndianPhone } from "@/lib/checkout-validation";
import type { Product } from "@/lib/types";
import type { StorefrontDetails } from "@/lib/storefront";
import { format } from "date-fns";
import { Spinner } from "@/components/ui/Spinner";

function buildKittyPartyMessage(notes: string, guestCount: string): string {
  const parts: string[] = [];
  if (guestCount.trim()) {
    parts.push(`Number of people: ${guestCount.trim()}`);
  }
  if (notes.trim()) {
    parts.push(notes.trim());
  }
  return parts.join("\n\n") || "Kitty party enquiry";
}

function ProductMultiSelect({
  products,
  selectedIds,
  onChange,
}: {
  products: Product[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabels = products
    .filter((p) => selectedIds.includes(p.id))
    .map((p) => p.title);

  const toggleProduct = (productId: string) => {
    onChange(
      selectedIds.includes(productId)
        ? selectedIds.filter((id) => id !== productId)
        : [...selectedIds, productId]
    );
  };

  const summary =
    selectedLabels.length === 0
      ? "Select desserts"
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} desserts selected`;

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs text-chocolate/55">Desserts</label>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="mt-1 flex w-full items-center justify-between rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-left text-sm outline-none focus:border-chocolate/30"
      >
        <span className={selectedLabels.length === 0 ? "text-chocolate/40" : "text-chocolate"}>
          {summary}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-chocolate/50 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-chocolate/10 bg-white py-1 shadow-lg ring-1 ring-chocolate/5">
          {products.length === 0 ? (
            <p className="px-3 py-2 text-sm text-chocolate/50">No desserts available</p>
          ) : (
            products.map((product) => {
              const checked = selectedIds.includes(product.id);
              return (
                <label
                  key={product.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-cream/80"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProduct(product.id)}
                    className="size-4 rounded border-chocolate/20 text-chocolate focus:ring-chocolate/30"
                  />
                  <span className="text-chocolate">{product.title}</span>
                </label>
              );
            })
          )}
        </div>
      )}

      {selectedLabels.length > 1 && (
        <p className="mt-1.5 text-xs text-chocolate/50">{selectedLabels.join(", ")}</p>
      )}
    </div>
  );
}

export function KittyPartyEnquiryClient({
  store,
  products,
}: {
  store: StorefrontDetails;
  products: Product[];
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [otpVerified, setOtpVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const menuProducts = useMemo(
    () => products.filter((p) => isMenuProduct(p) && p.is_active),
    [products]
  );

  const canSubmit =
    name.trim().length >= 2 &&
    isValidIndianPhone(phone) &&
    selectedProductIds.length >= 1 &&
    Boolean(eventDate);

  const submitEnquiry = async () => {
    if (!canSubmit || !otpVerified) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "kitty_party",
          name,
          phone,
          message: buildKittyPartyMessage(notes, guestCount),
          event_date: eventDate,
          items: selectedProductIds.map((productId) => ({
            product_id: productId,
            quantity: 1,
          })),
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

  const selectedProductLabels = menuProducts
    .filter((p) => selectedProductIds.includes(p.id))
    .map((p) => p.title);

  if (submitted) {
    return (
      <EnquirySuccess
        store={store}
        title="Kitty party enquiry sent"
        description="Thanks for submitting. Check WhatsApp for your enquiry reference — our team will get back to you shortly."
      />
    );
  }

  if (step === "verify") {
    return (
      <div className="flex min-h-screen flex-col pb-8">
        <OrderFlowHeader title="Kitty Party enquiry" backHref="/orders/enquiry" />

        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
          <HeartDivider className="mb-5" />
          <h2 className="font-display text-lg font-semibold text-chocolate">
            Verify your number
          </h2>
          <p className="mt-1 text-sm text-chocolate/60">
            Confirm +91 {phone} to submit your kitty party enquiry.
          </p>

          <div className="mt-4 space-y-2 rounded-xl bg-cream/50 p-4 text-sm text-chocolate/70">
            <p className="font-medium text-chocolate">{name}</p>
            {selectedProductLabels.length > 0 && (
              <p>{selectedProductLabels.join(", ")}</p>
            )}
            {eventDate && (
              <p>
                Event date:{" "}
                {format(new Date(`${eventDate}T12:00:00`), "d MMM yyyy")}
              </p>
            )}
            {guestCount.trim() && <p>Guests: {guestCount.trim()}</p>}
            {notes.trim() && <p>{notes.trim()}</p>}
          </div>

          <div className="mt-6">
            <PhoneOtpVerification
              phone={phone}
              source="kitty_party_enquiry"
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
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-chocolate py-3.5 text-sm font-medium text-cream disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" className="!text-cream/80" label="Submitting enquiry" />
                  <span>Submitting…</span>
                </>
              ) : (
                "Submit enquiry"
              )}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-8">
      <OrderFlowHeader title="Kitty Party enquiry" backHref="/orders/enquiry" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <HeartDivider className="mb-5" />
        <p className="text-sm text-chocolate/60">
          Tell us about your gathering — pick your desserts, date, and any notes. We&apos;ll
          reach out on WhatsApp.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) {
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
          </div>

          <ProductMultiSelect
            products={menuProducts}
            selectedIds={selectedProductIds}
            onChange={setSelectedProductIds}
          />

          <DatePicker
            label="Event date"
            value={eventDate}
            onChange={setEventDate}
            min={today}
            placeholder="When is your party?"
          />

          <div>
            <label className="text-xs text-chocolate/55">
              Number of people <span className="text-chocolate/40">(optional)</span>
            </label>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              placeholder="e.g. 12"
              className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none focus:border-chocolate/30"
            />
          </div>

          <div>
            <label className="text-xs text-chocolate/55">
              Notes <span className="text-chocolate/40">(optional)</span>
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Dietary needs, delivery address, preferences…"
              className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none focus:border-chocolate/30"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
          >
            Continue
          </button>
        </form>
      </main>
    </div>
  );
}
