import { AlertTriangle } from "lucide-react";
import type { DeliveryCalculation } from "@/lib/types";

export function deliveryUnreachableMessage(
  delivery: DeliveryCalculation | null | undefined
): string {
  return (
    delivery?.message ??
    "Sorry, we can't deliver to this location. Please pick a spot inside our delivery zone."
  );
}

export function LocationUnreachableBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-800 ring-1 ring-red-200"
    >
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
