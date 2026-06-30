import type { Metadata } from "next";
import { BRAND } from "@/lib/constants";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
  "https://sihibakes.in";

export const siteMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Handcrafted desserts and bakes from Sihi Bakes in Mangaluru. Order signature tiramisu, cakes, and treats for delivery.",
  keywords: [
    "Sihi Bakes",
    "bakery Mangaluru",
    "tiramisu",
    "desserts delivery",
    "online cake order",
  ],
  authors: [{ name: BRAND.name, url: siteUrl }],
  creator: BRAND.name,
  publisher: BRAND.name,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Handcrafted desserts and bakes delivered to your door. Order online from Sihi Bakes.",
    images: [
      {
        url: "/hero-tiramisu.png",
        width: 1200,
        height: 630,
        alt: `${BRAND.name} desserts`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description:
      "Handcrafted desserts and bakes delivered to your door.",
    images: ["/hero-tiramisu.png"],
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/logo.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/logo.png",
  },
};
