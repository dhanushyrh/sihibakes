import { Suspense } from "react";
import { StorePageSkeleton } from "@/components/store/StorePageSkeleton";
import OrderConfirmationClient from "./OrderConfirmationClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<StorePageSkeleton variant="order" />}>
      <OrderConfirmationClient params={params} />
    </Suspense>
  );
}
