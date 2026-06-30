import { StoreProviders } from "@/components/store/StoreProviders";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StoreProviders>{children}</StoreProviders>;
}
