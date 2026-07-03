import { redirect } from "next/navigation";

export default function CheckoutPage() {
  redirect("/orders/delivery/checkout");
}
