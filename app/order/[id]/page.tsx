import { Suspense } from "react";
import { StorePageSkeleton } from "@/components/store/StorePageSkeleton";
import { getOrderForConfirmation } from "@/lib/order-confirmation";
import OrderConfirmationClient from "./OrderConfirmationClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ phone?: string }>;
}) {
  const { id: orderNumber } = await params;
  const { phone = "" } = await searchParams;

  const initialOrder = !phone
    ? ({ error: "Phone required" } as const)
    : ((await getOrderForConfirmation(orderNumber, phone)) ??
      ({ error: "Could not load order" } as const));

  return (
    <Suspense fallback={<StorePageSkeleton variant="order" />}>
      <OrderConfirmationClient
        orderNumber={orderNumber}
        initialOrder={initialOrder}
      />
    </Suspense>
  );
}
