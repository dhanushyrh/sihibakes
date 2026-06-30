"use client";

import { CartProvider } from "@/components/store/CartProvider";
import { DeliverySessionProvider } from "@/components/store/DeliverySessionProvider";

export function StoreProviders({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <DeliverySessionProvider>{children}</DeliverySessionProvider>
    </CartProvider>
  );
}
