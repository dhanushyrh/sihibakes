import { StoreProviders } from "@/components/store/StoreProviders";

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StoreProviders>{children}</StoreProviders>;
}
