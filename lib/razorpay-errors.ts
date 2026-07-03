export function formatRazorpayPaymentError(error?: {
  description?: string;
  reason?: string;
}): string {
  const description = error?.description ?? "";
  const reason = error?.reason ?? "";
  const lower = description.toLowerCase();

  if (
    reason === "invalid_otp" ||
    lower.includes("incorrect otp") ||
    lower.includes("authentication failed")
  ) {
    return (
      "Card OTP was rejected on Razorpay's test page — this is not our phone verification code. " +
      "Tap Success on the mock bank page if shown, or use UPI with success@razorpay."
    );
  }

  if (reason === "otp_attempts_exceeded" || lower.includes("otp attempts")) {
    return (
      "Too many wrong card OTP attempts. Close Razorpay and try UPI with success@razorpay."
    );
  }

  if (lower.includes("cancelled") || reason === "payment_cancelled") {
    return "Payment was cancelled. You can try again.";
  }

  return description || "Payment failed. Please try again.";
}

export function formatRazorpayVerifyError(error?: string, code?: string): string {
  if (code === "INVALID_SIGNATURE") {
    return (
      "Payment went through on Razorpay but verification failed. " +
      "Check that RAZORPAY_KEY_SECRET matches the same key pair as NEXT_PUBLIC_RAZORPAY_KEY_ID."
    );
  }
  return error || "Payment verification failed. Please contact support with your order number.";
}
