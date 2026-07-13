import type { MetadataRoute } from "next";
import { LEGAL_PAGES } from "@/lib/legal-pages";
import { getSiteUrl } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/orders`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/orders/delivery`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/orders/delivery/menu`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/orders/enquiry`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    },
  ];

  const legalRoutes: MetadataRoute.Sitemap = LEGAL_PAGES.map((page) => ({
    url: `${siteUrl}${page.href}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  return [...staticRoutes, ...legalRoutes];
}
