import { Suspense } from "react";
import OrderConfirmationClient from "./OrderConfirmationClient";

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading...</div>}>
      <OrderConfirmationClient params={params} />
    </Suspense>
  );
}
