import Razorpay from "razorpay";

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
