import Razorpay from "razorpay";

export function getRazorpayPublicKey(): string | null {
  return (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim() ||
    process.env.RAZORPAY_KEY_ID?.trim() ||
    null
  );
}

/** Resolves the Razorpay key on server or client (server can read RAZORPAY_KEY_ID). */
export function getRazorpayKeyForModeCheck(): string | null {
  return getRazorpayPublicKey();
}

export function isRazorpayTestMode(key?: string | null): boolean {
  const resolved = key ?? getRazorpayKeyForModeCheck();
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
  prefill?: { name?: string; contact?: string; email?: string };
};

function buildCheckoutPrefill(prefill?: RazorpayCheckoutBuildParams["prefill"]) {
  if (!prefill) return undefined;

  const contact = prefill.contact?.replace(/\s/g, "");
  const digits = contact?.replace(/\D/g, "").slice(-10);
  // Razorpay only pre-selects a payment method when contact and email are prefilled.
  const email =
    prefill.email ??
    (digits ? `orders+${digits}@customers.sihibakes.in` : undefined);

  return { ...prefill, contact, email };
}

/** Standard Checkout options — amount comes from the Razorpay order, not the client. */
export function buildRazorpayCheckoutOptions(params: RazorpayCheckoutBuildParams) {
  const testMode = isRazorpayTestMode(params.key);
  const prefill = buildCheckoutPrefill(params.prefill);

  return {
    key: params.key,
    currency: "INR",
    name: params.name,
    description: params.description,
    image: params.image ?? "/logo.png",
    order_id: params.orderId,
    prefill,
    theme: { color: params.themeColor ?? "#4B2C20" },
    retry: { enabled: true, max_count: 3 },
    config: {
      display: {
        sequence: ["upi", "card", "netbanking", "wallet"],
        preferences: { show_default_blocks: true },
      },
    },
    ...(testMode ? { method: "upi" as const } : {}),
  };
}
