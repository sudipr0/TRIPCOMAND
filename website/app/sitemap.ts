import type { MetadataRoute } from "next";
import { routes, siteUrl } from "@/lib/site-config";

/**
 * Sitemap.
 *
 * A sitemap needs absolute URLs, so it is only emitted when the production
 * origin is configured (`NEXT_PUBLIC_SITE_URL`). With no origin the site serves
 * an empty sitemap and robots.txt omits the Sitemap directive — a guessed or
 * localhost hostname would be worse than none. See README → "Going live".
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return [];

  const lastModified = new Date("2026-10-29");

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}${routes.features}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${routes.pricing}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}${routes.about}`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}${routes.contact}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
