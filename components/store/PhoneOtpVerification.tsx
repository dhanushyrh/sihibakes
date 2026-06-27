"use client";

import { useCallback, useEffect, useState } from "react";
import { isValidIndianPhone } from "@/lib/checkout-validation";
import type { LegalConsentSource } from "@/lib/legal-consent";
import { LegalConsentCheckbox } from "@/components/store/LegalConsentCheckbox";

type PhoneOtpVerificationProps = {
  phone: string;
  source: LegalConsentSource;
  onVerified: () => void;
  autoSendOnMount?: boolean;
  verified?: boolean;
  error?: string;
  onError?: (message: string) => void;
  submitLabel?: string;
  className?: string;
};

export function PhoneOtpVerification({
  phone,
  source,
  onVerified,
  autoSendOnMount = true,
  verified: verifiedProp,
  error: externalError,
  onError,
  submitLabel = "Verify",
  className = "",
}: PhoneOtpVerificationProps) {
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState("");
  const [otpDemoMode, setOtpDemoMode] = useState(true);
  const [locallyVerified, setLocallyVerified] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [localError, setLocalError] = useState("");

  const otpVerified = Boolean(verifiedProp) || locallyVerified;
  const error = externalError || localError;

  const sendOtp = useCallback(async () => {
    if (!isValidIndianPhone(phone)) {
      const msg = "Enter a valid WhatsApp number before requesting a code";
      setLocalError(msg);
      onError?.(msg);
      return false;
    }
    setSendingOtp(true);
    setLocalError("");
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || "Could not send OTP";
        setLocalError(msg);
        onError?.(msg);
        return false;
      }
      if (data.already_verified) {
        setAlreadyVerified(true);
        setOtpDemoMode(Boolean(data.demo_mode));
        setOtpHint("Phone number already verified.");
        setOtpSent(true);
        return true;
      }
      setAlreadyVerified(false);
      setOtpDemoMode(Boolean(data.demo_mode));
      setOtpSent(true);
      setOtpHint(
        data.debug_otp
          ? `Your verification code: ${data.debug_otp}`
          : data.message || "Code sent to your WhatsApp number"
      );
      return true;
    } catch {
      const msg = "Could not send OTP";
      setLocalError(msg);
      onError?.(msg);
      return false;
    } finally {
      setSendingOtp(false);
    }
  }, [phone, onError]);

  useEffect(() => {
    if (autoSendOnMount && isValidIndianPhone(phone) && !otpSent && !otpVerified) {
      const timer = window.setTimeout(() => {
        void sendOtp();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [autoSendOnMount, phone, otpSent, otpVerified, sendOtp]);

  const confirmVerification = async () => {
    if (!consentAccepted) {
      const msg = "Please accept the Terms & Conditions and Privacy Policy";
      setLocalError(msg);
      onError?.(msg);
      return;
    }

    if (!alreadyVerified && otp.length !== 6) {
      const msg = "Enter the 6-digit verification code";
      setLocalError(msg);
      onError?.(msg);
      return;
    }

    setVerifyingOtp(true);
    setLocalError("");
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: alreadyVerified ? undefined : otp,
          accept_legal: true,
          source,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid verification code");
      }
      setLocallyVerified(true);
      onVerified();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const canSubmit =
    consentAccepted && (alreadyVerified || otp.length === 6) && !verifyingOtp;

  if (otpVerified) {
    return (
      <div className={className}>
        <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200">
          Phone number verified
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <p className="text-sm text-chocolate/60">
        Enter the verification code for +91 {phone}
      </p>

      {alreadyVerified && (
        <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800 ring-1 ring-green-200">
          Phone already verified. Please confirm the policies to continue.
        </p>
      )}

      {otpHint && !alreadyVerified && (
        <p className="rounded-xl bg-gold/20 px-3 py-3 text-sm font-medium text-chocolate ring-1 ring-gold/40">
          {otpHint}
        </p>
      )}

      {!otpHint && !alreadyVerified && (
        <p className="text-xs text-chocolate/50">
          {otpDemoMode
            ? "Tap Resend to generate a verification code."
            : "Waiting for code… If nothing arrives, tap Resend below."}
        </p>
      )}

      {!alreadyVerified && (
        <>
          <input
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className="w-full rounded-xl border border-chocolate/10 bg-white px-3 py-4 text-center text-2xl tracking-[0.4em] outline-none focus:border-chocolate/30"
          />

          <button
            type="button"
            disabled={sendingOtp}
            onClick={() => void sendOtp()}
            className="text-sm text-chocolate/70 underline"
          >
            {sendingOtp ? "Sending..." : "Resend code"}
          </button>
        </>
      )}

      <LegalConsentCheckbox
        checked={consentAccepted}
        onChange={setConsentAccepted}
        id={`legal-consent-${source}`}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void confirmVerification()}
        className="w-full rounded-full bg-chocolate py-4 text-sm font-medium text-cream disabled:opacity-40"
      >
        {verifyingOtp
          ? "Verifying..."
          : alreadyVerified
            ? "Confirm & continue"
            : submitLabel}
      </button>
    </div>
  );
}
