import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Manrope } from "next/font/google";

import "./globals.css";
import { siteUrl, site } from "@/lib/site-config";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { jsonLdScript, organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";

// Manrope for headings and the wordmark, Inter for UI and body copy. Both are
// self-hosted by next/font at build time, so there is no third-party request.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SHARE_IMAGE_ALT =
  "TrailComand — operational recovery for complex, multi-day trips, in development";
// Only read when `siteUrl` is set (see the conditional spreads below).
const shareImage = {
  url: `${siteUrl}/social-card.png`,
  width: 1200,
  height: 630,
  alt: SHARE_IMAGE_ALT,
};

export const metadata: Metadata = {
  // Absolute-URL metadata (canonical, Open Graph) is only emitted when the real
  // production origin is configured. No domain is invented here.
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "TrailComand — Operational recovery for complex, multi-day trips",
    template: "%s · TrailComand",
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "trekking agency software",
    "adventure travel operations",
    "trip disruption management",
    "tour operator operations software",
    "multi-day trip coordination",
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  publisher: site.name,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // Share image is registered explicitly, and only once the real origin exists,
  // so Next never has to fall back to a placeholder hostname.
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_GB",
    title: "TrailComand — Operational recovery for complex, multi-day trips",
    description: site.description,
    ...(siteUrl ? { url: siteUrl, images: [shareImage] } : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: "TrailComand — Operational recovery for complex, multi-day trips",
    description: site.description,
    ...(siteUrl ? { images: [{ url: shareImage.url, alt: SHARE_IMAGE_ALT }] } : {}),
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#FAF9F6",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GB"
      className={`${inter.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink selection:bg-mint selection:text-navy">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
        {jsonLdScript([organizationJsonLd(), websiteJsonLd()])}
      </body>
    </html>
  );
}
