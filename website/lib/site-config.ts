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
 *   NEXT_PUBLIC_LOGIN_URL           Login destination for the in-app product.
 *   NEXT_PUBLIC_APP_STATUS_URL      Where the in-development app is announced.
 *   NEXT_PUBLIC_CONTACT_FORM_ENDPOINT
 *                                   Formspree endpoint. When empty, the contact
 *                                   form switches to a documented fallback.
 *   NEXT_PUBLIC_CONTACT_EMAIL       Optional public address. When empty, the
 *                                   site does not advertise an email at all.
 *
 * DELIBERATE NULLS
 * ----------------
 * Several values have **no default** because a plausible-looking default is
 * worse than nothing:
 *
 *   - `loginUrl` is null until the product is actually deployed. The previous
 *     default (`https://app.trailcomand.com/login`) was a dead domain: every
 *     "Login" link on the site 404'd at the DNS level.
 *   - `contactEmail` is null until a monitored mailbox exists. The previous
 *     default (`hello@trailcomand.com`) was on a domain with no DNS or MX
 *     record, so instructions to email it could never have worked.
 *
 * Update `.env.local` (and the host's build env) to turn either on. See the
 * README §2.
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

function readEmail(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  // Minimal shape check; deliverability is the owner's responsibility.
  const at = trimmed.indexOf("@");
  return at > 0 && trimmed.slice(at + 1).includes(".") ? trimmed : null;
}

/**
 * Canonical origin. `null` means "not configured", which deliberately disables
 * canonical tags and absolute-URL social metadata rather than inventing a domain.
 */
export const siteUrl = readOrigin(process.env.NEXT_PUBLIC_SITE_URL);

/** Product login, or null when the application is not deployed. Never faked. */
export const loginUrl = readUrl(process.env.NEXT_PUBLIC_LOGIN_URL);

/** Public email, or null. Never advertise a mailbox that cannot receive mail. */
export const contactEmail = readEmail(process.env.NEXT_PUBLIC_CONTACT_EMAIL);

/** Formspree form endpoint (`https://formspree.io/f/xxxxxxx`), or null if unset. */
export const contactFormEndpoint = readUrl(process.env.NEXT_PUBLIC_CONTACT_FORM_ENDPOINT);

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
  /**
   * The deployed marketing site. `website-lac-six-89.vercel.app` is the original
   * deployment URL the owner supplied; it now 307-redirects to
   * `trailcomand.vercel.app` (verified 2026-10-29), so the latter is recorded as
   * the canonical origin to set in NEXT_PUBLIC_SITE_URL. Neither is a custom
   * domain, and this constant is documentation only — metadata reads `siteUrl`.
   */
  vercelUrl: "https://trailcomand.vercel.app",
  legacyVercelUrl: "https://website-lac-six-89.vercel.app",
} as const;

/** Every public route, reused by navigation, the footer, the sitemap and links. */
export const routes = {
  home: "/",
  features: "/features",
  pricing: "/pricing",
  about: "/about",
  contact: "/contact",
  privacy: "/privacy",
  terms: "/terms",
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

/** Legal pages. Listed in the footer and the sitemap. */
export const legalNav: ReadonlyArray<{ key: RouteKey; label: string; href: string }> = [
  { key: "privacy", label: "Privacy", href: routes.privacy },
  { key: "terms", label: "Terms", href: routes.terms },
];

/** Default CTA label so the promise is identical on every surface. */
export const PILOT_CTA_LABEL = "Request a Pilot";
export const PILOT_CTA_HREF = routes.contact;

/** In-page anchor for the hero's secondary CTA. */
export const PREVIEW_ANCHOR = "#product-preview";
