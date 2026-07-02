"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { IndianPhoneInput } from "@/components/store/IndianPhoneInput";
import { PhoneOtpVerification } from "@/components/store/PhoneOtpVerification";
import { isValidIndianPhone } from "@/lib/checkout-validation";
import { useScrollToTopOnChange } from "@/components/store/ScrollToTop";
import { Spinner } from "@/components/ui/Spinner";

export function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<"form" | "verify" | "done">("form");
  useScrollToTopOnChange(step);
  const [otpVerified, setOtpVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
          type: "landing",
          name,
          phone,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send message");
        return;
      }
      setStep("done");
      setName("");
      setPhone("");
      setMessage("");
      setOtpVerified(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.75rem] bg-white p-8 text-center shadow-[var(--shadow-card)] ring-1 ring-chocolate/6">
        <CheckCircle size={40} className="text-gold" />
        <h3 className="mt-4 font-display text-xl font-semibold text-chocolate">
          Message sent!
        </h3>
        <p className="mt-2 text-sm text-chocolate/60">
          Thank you for reaching out. We&apos;ve sent a confirmation to your WhatsApp — our team will get back to you soon.
        </p>
        <button
          type="button"
          onClick={() => setStep("form")}
          className="mt-5 text-sm font-medium text-chocolate underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="rounded-[1.75rem] bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-chocolate/6 md:p-8">
        <h3 className="font-display text-xl font-semibold text-chocolate">
          Verify your number
        </h3>
        <p className="mt-1 text-sm text-chocolate/55">
          Confirm +91 {phone} to send your message.
        </p>

        <div className="mt-4 rounded-xl bg-cream/50 p-4 text-sm text-chocolate/70">
          <p className="font-medium text-chocolate">{name}</p>
          <p className="mt-2">{message}</p>
        </div>

        <div className="mt-6">
          <PhoneOtpVerification
            phone={phone}
            source="landing_contact"
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
                <Spinner size="sm" className="!text-cream/80" label="Sending message" />
                <span>Sending…</span>
              </>
            ) : (
              "Send message"
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
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
      className="rounded-[1.75rem] bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-chocolate/6 md:p-8"
    >
      <h3 className="font-display text-xl font-semibold text-chocolate">
        Send us a message
      </h3>
      <p className="mt-1 text-sm text-chocolate/55">
        Kitty parties, custom orders, or any questions — we&apos;re here to help.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-xs text-chocolate/55">Your name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-chocolate/10 bg-cream/30 px-3 py-3 text-sm outline-none focus:border-chocolate/25"
          />
        </div>
        <div>
          <label className="text-xs text-chocolate/55">WhatsApp number</label>
          <IndianPhoneInput
            value={phone}
            onChange={setPhone}
            placeholder="9876543210"
          />
        </div>
        <div>
          <label className="text-xs text-chocolate/55">Message</label>
          <textarea
            required
            rows={4}
            minLength={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your order, event, or question..."
            className="mt-1 w-full resize-none rounded-xl border border-chocolate/10 bg-cream/30 px-3 py-3 text-sm outline-none focus:border-chocolate/25"
          />
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={
          submitting ||
          name.trim().length < 2 ||
          !isValidIndianPhone(phone) ||
          message.trim().length < 10
        }
        className="mt-6 w-full rounded-full bg-chocolate py-3.5 text-sm font-medium text-cream transition hover:bg-chocolate-dark disabled:opacity-50"
      >
        Continue
      </button>
    </form>
  );
}
