"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { IndianPhoneInput } from "@/components/store/IndianPhoneInput";
import { PhoneOtpVerification } from "@/components/store/PhoneOtpVerification";
import { isValidIndianPhone } from "@/lib/checkout-validation";

type CheckoutAuthSheetProps = {
  open: boolean;
  onClose: () => void;
  onVerified: (phone: string) => void | Promise<void>;
  initialPhone?: string;
};

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  const last4 = phone.slice(-4);
  return `+91 XXXXX X${last4}`;
}

export function CheckoutAuthSheet({
  open,
  onClose,
  onVerified,
  initialPhone = "",
}: CheckoutAuthSheetProps) {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState(initialPhone);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPhone(initialPhone);
      setStep(0);
      setError("");
      setCompleting(false);
    }
  }, [open, initialPhone]);

  if (!open) return null;

  const handleVerified = async () => {
    setCompleting(true);
    try {
      await onVerified(phone);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue");
      setCompleting(false);
    }
  };

  const goToOtp = () => {
    if (!isValidIndianPhone(phone)) {
      setError("Enter a valid 10-digit WhatsApp number");
      return;
    }
    setError("");
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex flex-col items-center pt-3">
          <div className="h-1 w-10 rounded-full bg-chocolate/15" />
        </div>

        <div className="flex items-center justify-between px-5 pt-3">
          <div className="flex gap-1.5">
            {[0, 1].map((i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i <= step ? "bg-chocolate" : "bg-chocolate/15"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-chocolate"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-6 pt-4">
          {completing ? (
            <div className="py-8 text-center">
              <p className="font-display text-lg font-semibold text-chocolate">
                Verified ✓
              </p>
              <p className="mt-2 text-sm text-chocolate/60">Taking you to checkout…</p>
            </div>
          ) : step === 0 ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-chocolate">
                  Confirm your WhatsApp number
                </h2>
                <p className="mt-1 text-sm text-chocolate/60">
                  Order updates and your verification code are sent here.
                </p>
              </div>

              <div>
                <label className="text-xs text-chocolate/55">WhatsApp number</label>
                <IndianPhoneInput
                  value={phone}
                  onChange={setPhone}
                  autoComplete="tel-national"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="button"
                disabled={!isValidIndianPhone(phone)}
                onClick={goToOtp}
                className="w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
              >
                Send verification code
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-chocolate">
                  Enter verification code
                </h2>
                <p className="mt-1 text-sm text-chocolate/60">
                  Sent to {maskPhone(phone)}
                  <button
                    type="button"
                    onClick={() => {
                      setStep(0);
                      setError("");
                    }}
                    className="ml-2 text-chocolate underline"
                  >
                    Change number
                  </button>
                </p>
              </div>

              <PhoneOtpVerification
                phone={phone}
                onVerified={() => void handleVerified()}
                autoSendOnMount
                error={error}
                onError={setError}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
