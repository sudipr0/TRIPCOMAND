/**
 * Central site configuration.
 *
 * Everything environment-dependent lives here so pages and components never
 * hard-code a URL, an endpoint, or a status claim.
 *
 * Environment variables (all optional, all public — see `.env.example`):
 *
 *   NEXT_PUBLIC_SITE_URL            Canonical origin used for metadataBase,
 *                                   canonical links, sitemap and robots.
 *                                   Leave empty until the production domain is
 *                                   confirmed; nothing is fabricated in its place.
 *   NEXT_PUBLIC_LOGIN_URL           Login destination for the in-app product.
 *   NEXT_PUBLIC_CONTACT_FORM_ENDPOINT
 *                                   Formspree endpoint. When empty the contact
 *                                   page switches to the documented mailto
 *                                   fallback instead of pretending to send.
 *   NEXT_PUBLIC_CONTACT_EMAIL       Address used by the mailto fallback and the
 *                                   privacy note.
 */

function readOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function readUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Canonical origin. `null` means "not configured", which deliberately disables
 * canonical tags and absolute-URL social metadata rather than inventing a domain.
 */
export const siteUrl = readOrigin(process.env.NEXT_PUBLIC_SITE_URL);

/**
 * The product login. The brief fixes this exact secure URL, so it is the
 * default; it can be overridden per environment without a code change.
 */
export const loginUrl =
  readUrl(process.env.NEXT_PUBLIC_LOGIN_URL) ?? "https://app.trailcomand.com/login";

/** Formspree form endpoint (`https://formspree.io/f/xxxxxxx`), or null if unset. */
export const contactFormEndpoint = readUrl(process.env.NEXT_PUBLIC_CONTACT_FORM_ENDPOINT);

/** Human address for the mailto fallback and privacy note. */
export const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "hello@trailcomand.com";

export const site = {
  name: "TrailComand",
  tagline: "The operational recovery layer for complex, multi-day trips.",
  description:
    "TrailComand is an operations platform for trekking and adventure travel agencies. Record trip disruptions, understand the impact on itineraries, guides, suppliers and travelers, and coordinate recovery in one place.",
  /** Product stage, stated plainly wherever the site describes readiness. */
  stage: "In development",
  contactEmail,
  loginUrl,
  siteUrl,
} as const;

/** Every public route, reused by navigation, the footer, the sitemap and links. */
export const routes = {
  home: "/",
  features: "/features",
  pricing: "/pricing",
  about: "/about",
  contact: "/contact",
} as const;

export type RouteKey = keyof typeof routes;

export const primaryNav: ReadonlyArray<{
  key: RouteKey;
  label: string;
  href: string;
}> = [
  { key: "features", label: "Features", href: routes.features },
  { key: "pricing", label: "Pricing", href: routes.pricing },
  { key: "about", label: "About", href: routes.about },
  { key: "contact", label: "Contact", href: routes.contact },
];

/** Default CTA label so the promise is identical on every surface. */
export const PILOT_CTA_LABEL = "Request a Pilot";
export const PILOT_CTA_HREF = routes.contact;
