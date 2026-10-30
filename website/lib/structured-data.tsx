import { site, siteUrl } from "@/lib/site-config";

/**
 * JSON-LD for the marketing site.
 *
 * Only facts the site can prove are emitted:
 *
 *   - `Organization`: name, canonical URL, logo — no founders, no address, no
 *     VAT number, no social profiles (none exist).
 *   - `WebSite`: name + URL, so search engines can attribute sitelinks.
 *   - `FAQPage` on the homepage: mirrors the visible FAQ verbatim. Google's
 *     guidance requires the marked-up answer to be present on the page, which it
 *     is, and no answer is written for the markup alone.
 *   - `BreadcrumbList` on supporting pages.
 *
 * Deliberately omitted: `SoftwareApplication`/`Product` with offers, ratings or
 * aggregate counts (the product is unreleased and there are no reviews), and
 * any `LocalBusiness` type (no public address).
 */

type JsonLd = Record<string, unknown>;

const organization = (): JsonLd => ({
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: site.name,
  url: `${siteUrl}/`,
  logo: `${siteUrl}/icon.svg`,
  description: site.description,
});

export function organizationJsonLd(): JsonLd | null {
  if (!siteUrl) return null;
  return { "@context": "https://schema.org", ...organization() };
}

export function websiteJsonLd(): JsonLd | null {
  if (!siteUrl) return null;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: site.name,
    url: `${siteUrl}/`,
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

export function faqJsonLd(
  faqs: ReadonlyArray<{ question: string; answer: string }>,
): JsonLd | null {
  if (!siteUrl || faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function breadcrumbJsonLd(
  trail: ReadonlyArray<{ name: string; path: string }>,
): JsonLd | null {
  if (!siteUrl || trail.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

/** Renders one or more JSON-LD objects as a single script tag. */
export function jsonLdScript(items: ReadonlyArray<JsonLd | null>) {
  const data = items.filter((item): item is JsonLd => item !== null);
  if (data.length === 0) return null;
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped for `<` so no value can close the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data.length === 1 ? data[0] : data).replace(
          /</g,
          "\\u003c",
        ),
      }}
    />
  );
}
