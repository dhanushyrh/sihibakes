import { StoreProviders } from "@/components/store/StoreProviders";

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StoreProviders>{children}</StoreProviders>;
}
