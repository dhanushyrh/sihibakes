"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { OrderFlowHeader } from "@/components/orders/OrderFlowHeader";
import { EnquiryStepProgress } from "@/components/orders/EnquiryStepProgress";
import { EnquirySuccess } from "@/components/orders/EnquirySuccess";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductDetailModal } from "@/components/store/ProductDetailModal";
import { IndianPhoneInput } from "@/components/store/IndianPhoneInput";
import { PhoneOtpVerification } from "@/components/store/PhoneOtpVerification";
import { DatePicker } from "@/components/store/DatePicker";
import { TimePicker } from "@/components/store/TimePicker";
import { HeartDivider } from "@/components/landing/HeartDivider";
import { isMenuProduct } from "@/lib/cart-products";
import { formatTimeDisplay } from "@/lib/datetime-picker";
import { TAG_OPTIONS } from "@/lib/constants";
import type { Product, ProductTag } from "@/lib/types";
import type { StorefrontDetails } from "@/lib/storefront";
import { format } from "date-fns";

const STEPS = 4;

export function KittyPartyEnquiryClient({
  store,
  products,
}: {
  store: StorefrontDetails;
  products: Product[];
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [tagFilter, setTagFilter] = useState<ProductTag | "all">("all");
  const [otpVerified, setOtpVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (!isMenuProduct(p)) return false;
      if (tagFilter !== "all" && !p.tags.includes(tagFilter)) return false;
      return p.is_active;
    });
  }, [products, tagFilter]);

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const selectedCount = selectedProductIds.length;

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
          type: "kitty_party",
          name,
          phone,
          message: notes.trim() || "Kitty party enquiry",
          event_date: eventDate,
          event_time: eventTime,
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

  if (submitted) {
    return <EnquirySuccess store={store} title="Kitty party enquiry sent" />;
  }

  const stepTitles = [
    "Your details",
    "Choose desserts",
    "Event details",
    "Verify & send",
  ];

  return (
    <div className="flex min-h-screen flex-col pb-8">
      <OrderFlowHeader title="Kitty Party enquiry" backHref="/orders" />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        <HeartDivider className="mb-2" />
        <h2 className="text-center font-display text-lg font-semibold text-chocolate">
          {stepTitles[step]}
        </h2>
        <EnquiryStepProgress step={step} total={STEPS} />

        {step === 0 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-chocolate/60">
              Tell us who to contact. We&apos;ll send a verification code to your
              WhatsApp number.
            </p>
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
            <button
              type="button"
              disabled={name.trim().length < 2 || !isValidIndianPhone(phone)}
              onClick={() => setStep(1)}
              className="w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <>
            <p className="mt-4 text-sm text-chocolate/60">
              Pick the desserts you&apos;re interested in. Select at least one.
            </p>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setTagFilter("all")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                  tagFilter === "all"
                    ? "bg-chocolate text-cream"
                    : "bg-white text-chocolate ring-1 ring-chocolate/10"
                }`}
              >
                All
              </button>
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTagFilter(t.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                    tagFilter === t.key
                      ? "bg-chocolate text-cream"
                      : "bg-white text-chocolate ring-1 ring-chocolate/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 pb-24">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={setSelected}
                  selectionMode
                  selected={selectedProductIds.includes(product.id)}
                  onToggleSelect={(p) => toggleProduct(p.id)}
                />
              ))}
            </div>
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-chocolate/10 bg-cream/95 px-4 py-3 backdrop-blur-md">
              <div className="mx-auto flex max-w-lg gap-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="rounded-full border border-chocolate/20 px-5 py-3.5 text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={selectedCount < 1}
                  onClick={() => setStep(2)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-chocolate py-3.5 text-sm font-medium text-cream disabled:opacity-40"
                >
                  {selectedCount} selected · Continue
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <DatePicker
              label="Event date"
              value={eventDate}
              onChange={setEventDate}
              min={today}
              placeholder="When is your party?"
            />
            <TimePicker
              label="Event time"
              value={eventTime}
              onChange={setEventTime}
              startHour={9}
              endHour={21}
              placeholder="Pick a time"
            />
            <div>
              <label className="text-xs text-chocolate/55">
                Notes <span className="text-chocolate/40">(optional)</span>
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Guest count, dietary needs, delivery address…"
                className="mt-1 w-full rounded-xl border border-chocolate/10 bg-white px-3 py-3 text-sm outline-none focus:border-chocolate/30"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-full border border-chocolate/20 py-4 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!eventDate || !eventTime}
                onClick={() => setStep(3)}
                className="flex-1 rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-white p-4 ring-1 ring-chocolate/10">
              <p className="font-medium text-chocolate">{name}</p>
              <p className="text-sm text-chocolate/60">+91 {phone}</p>
              {eventDate && (
                <p className="mt-2 text-sm text-chocolate/70">
                  {format(new Date(`${eventDate}T12:00:00`), "d MMM yyyy")}
                  {eventTime ? ` · ${formatTimeDisplay(eventTime)}` : ""}
                </p>
              )}
              <ul className="mt-3 space-y-1 border-t border-chocolate/10 pt-3 text-sm text-chocolate/80">
                {selectedProductIds.map((productId) => {
                  const product = products.find((p) => p.id === productId);
                  return (
                    <li key={productId}>{product?.title ?? "Product"}</li>
                  );
                })}
              </ul>
              {notes && (
                <p className="mt-3 border-t border-chocolate/10 pt-3 text-sm text-chocolate/60">
                  {notes}
                </p>
              )}
            </div>

            <PhoneOtpVerification
              phone={phone}
              onVerified={() => setOtpVerified(true)}
              onError={setError}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-full border border-chocolate/20 py-4 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!otpVerified || submitting}
                onClick={() => void submitEnquiry()}
                className="flex-1 rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
              >
                {submitting ? "Sending..." : "Submit enquiry"}
              </button>
            </div>
          </div>
        )}
      </main>

      {selected && (
        <ProductDetailModal
          product={selected}
          onClose={() => setSelected(null)}
          onAdd={() => {}}
          selectionMode
          selected={selectedProductIds.includes(selected.id)}
          onToggleSelect={(product) => toggleProduct(product.id)}
        />
      )}
    </div>
  );
}
