import type { Metadata } from "next";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Cormorant_Garamond, Sora } from "next/font/google";
import "./globals.css";
import { ScrollToTop } from "@/components/store/ScrollToTop";
import { siteMetadata } from "@/lib/site-metadata";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600"],
  display: "optional",
});

export const metadata: Metadata = siteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${display.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
