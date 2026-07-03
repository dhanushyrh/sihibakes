import { Suspense } from "react";
import { StoreProviders } from "@/components/store/StoreProviders";
import { ScrollToTop } from "@/components/store/ScrollToTop";

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProviders>
      <Suspense fallback={null}>
        <ScrollToTop />
      </Suspense>
      {children}
    </StoreProviders>
  );
}
