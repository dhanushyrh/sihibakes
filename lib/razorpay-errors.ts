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
      "Payment OTP was incorrect. This is the bank OTP on Razorpay's screen — not your WhatsApp code. " +
      "For test payments use card 4111 1111 1111 1111 and enter any 6-digit OTP (e.g. 123456)."
    );
  }

  if (lower.includes("cancelled") || reason === "payment_cancelled") {
    return "Payment was cancelled. You can try again.";
  }

  return description || "Payment failed. Please try again.";
}
