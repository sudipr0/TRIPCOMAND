import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The product itself lives on its own subdomain; nothing here is private,
      // but Next's internal asset routes are not worth crawling either.
      disallow: ["/_next/", "/api/"],
    },
    // Only advertised once the real origin is configured.
    ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl } : {}),
  };
}
