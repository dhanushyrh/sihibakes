import { StoreProviders } from "@/components/store/StoreProviders";

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StoreProviders>{children}</StoreProviders>;
}
