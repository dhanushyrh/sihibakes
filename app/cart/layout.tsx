import { StoreProviders } from "@/components/store/StoreProviders";

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StoreProviders>{children}</StoreProviders>;
}
