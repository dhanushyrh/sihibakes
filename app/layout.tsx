import type { Metadata } from "next";
import { Cormorant_Garamond, Sora, Great_Vibes } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/store/CartProvider";
import { DeliverySessionProvider } from "@/components/store/DeliverySessionProvider";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = "force-no-store";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const script = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description:
    "Handcrafted desserts and bakes delivered to your door. Order our signature Classic Tiramisu and more.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${display.variable} ${script.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <CartProvider>
          <DeliverySessionProvider>
            {children}
          </DeliverySessionProvider>
        </CartProvider>
      </body>
    </html>
  );
}
