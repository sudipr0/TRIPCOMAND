import type { Metadata } from "next";

import { siteUrl } from "@/lib/site-config";

const OG_IMAGE_PATH = "/social-card.png";
const OG_IMAGE_ALT =
  "TrailComand — operational recovery for complex, multi-day trips, in development";
const OG_IMAGE_SIZE = { width: 1200, height: 630 };

/**
 * Build page metadata without inventing a domain.
 *
 * A share image e.g. `/social-card.png` in `public/` needs an absolute URL. An
 * absolute URL needs an origin. Until `NEXT_PUBLIC_SITE_URL` is configured there
 * is no origin we can honestly claim, so:
 *
 *   - canonical links are omitted (nothing to point at)
 *   - og:url / og:image / twitter:image are omitted
 *   - title/description/type are still emitted, which is what most platforms
 *     fall back to
 *
 * Configure NEXT_PUBLIC_SITE_URL at build time to turn all of it on at once.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const suffix = path === "/" ? "" : path;
  let canonical: string | null = null;
  let image: string | null = null;
  if (siteUrl) {
    canonical = `${siteUrl}${suffix}`;
    image = `${siteUrl}${OG_IMAGE_PATH}`;
  }

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: "website",
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
      ...(image
        ? {
            images: [
              {
                url: image,
                width: OG_IMAGE_SIZE.width,
                height: OG_IMAGE_SIZE.height,
                alt: OG_IMAGE_ALT,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [{ url: image, alt: OG_IMAGE_ALT }] } : {}),
    },
  };
}
