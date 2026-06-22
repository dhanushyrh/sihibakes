import Razorpay from "razorpay";

export function getRazorpayPublicKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    process.env.RAZORPAY_KEY_ID?.trim() ||
    null
  );
}

export function isRazorpayTestMode(key?: string | null): boolean {
  const resolved = key ?? getRazorpayPublicKey();
  return Boolean(resolved?.startsWith("rzp_test_"));
}

export function getRazorpayInstance() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export async function createRazorpayOrder(amountInr: number, receipt: string) {
  const razorpay = getRazorpayInstance();
  return razorpay.orders.create({
    amount: Math.round(amountInr * 100),
    currency: "INR",
    receipt,
  });
}

export type RazorpayCheckoutBuildParams = {
  key: string;
  orderId: string;
  name: string;
  description: string;
  image?: string;
  themeColor?: string;
  prefill?: { name?: string; contact?: string };
};

/** Standard Checkout options — amount comes from the Razorpay order, not the client. */
export function buildRazorpayCheckoutOptions(params: RazorpayCheckoutBuildParams) {
  return {
    key: params.key,
    currency: "INR",
    name: params.name,
    description: params.description,
    image: params.image ?? "/logo.png",
    order_id: params.orderId,
    prefill: params.prefill,
    theme: { color: params.themeColor ?? "#4B2C20" },
    retry: { enabled: true, max_count: 3 },
  };
}

export function getRazorpayTestPaymentHelp(): string[] {
  return [
    "Use test keys (rzp_test_…) in .env — both RAZORPAY_KEY_ID and NEXT_PUBLIC_RAZORPAY_KEY_ID must match.",
    "Card: 5267 3181 8797 5449 or 4111 1111 1111 1111 · any future expiry · any CVV.",
    "On Razorpay's test bank page, enter any 4–10 digit code (e.g. 123456) and tap Submit — or tap Success if shown.",
    "Easier: choose UPI and pay with success@razorpay (no OTP).",
    "The code on our checkout screen is only for phone verification — not the card OTP.",
  ];
}
