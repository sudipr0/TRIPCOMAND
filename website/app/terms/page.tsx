import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { pageMetadata } from "@/lib/page-metadata";
import { routes } from "@/lib/site-config";

export const metadata: Metadata = pageMetadata({
  title: "Terms",
  description:
    "The terms that apply to this TrailComand marketing website, and how pilot arrangements are agreed separately while the product is in development.",
  path: "/terms",
});

const LAST_UPDATED = "29 October 2026";

export default function TermsPage() {
  return (
    <main id="main" className="flex-1">
      <div className="container-page py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            as="h1"
            eyebrow="Terms"
            title="Terms for using this website."
            description={`Last updated ${LAST_UPDATED}. These terms cover the marketing website. They are not a product licence, and they are not a pilot agreement.`}
          />

          <div className="mt-10 space-y-10">
            <Section id="status" title="The product is in development">
              <p>
                TrailComand is not a released product. Descriptions of capabilities on
                this site indicate intent and the current state of a development build.
                Anything labelled <em>In development</em> or <em>Planned</em> may change,
                be delayed, or not ship. Nothing on this site is a commitment that a
                feature will be available to you.
              </p>
            </Section>

            <Section id="pilot" title="Pilots are agreed separately">
              <p>
                Information about a pilot on this website is an invitation to talk, not an
                offer capable of acceptance. Any pilot — including its duration, cost (if
                any), scope, support and data handling — is agreed in writing between you
                and TrailComand before any access is provided. Where this site and a
                signed pilot agreement differ, the agreement governs.
              </p>
            </Section>

            <Section id="website" title="Using this website">
              <p>
                You may read, quote and link to these pages. You may not use the site to
                attempt to break it, to scrape it at a volume that degrades it for others,
                or to misrepresent TrailComand or its capabilities.
              </p>
            </Section>

            <Section id="content" title="Accuracy and liability">
              <p>
                We take care to keep this site accurate and to label the state of every
                capability, but it is provided as-is. If something here is wrong, tell us
                and we will correct it. To the extent the law allows, we are not liable
                for losses arising from reliance on the marketing material on this
                website; commercial terms will be set out in any pilot agreement.
              </p>
            </Section>

            <Section id="privacy" title="Privacy">
              <p>
                How this website handles your information is described on the{" "}
                <Link
                  href={routes.privacy}
                  className="rounded font-medium text-teal-ink underline decoration-mint-line underline-offset-2 hover:decoration-teal-ink"
                >
                  Privacy page
                </Link>
                , which forms part of these terms.
              </p>
            </Section>

            <Section id="changes" title="Changes">
              <p>
                These terms may be updated as the product develops. The date at the top of
                this page shows when they last changed. For anything material, we will say
                so on the site rather than changing it quietly.
              </p>
            </Section>

            <Section id="contact" title="Getting in touch">
              <p>
                Questions about these terms?{" "}
                <Link
                  href={routes.contact}
                  className="rounded font-medium text-teal-ink underline decoration-mint-line underline-offset-2 hover:decoration-teal-ink"
                >
                  Use the contact page
                </Link>
                .
              </p>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`t-${id}`}>
      <h2 id={`t-${id}`} className="text-lg font-semibold tracking-[-0.015em] text-ink">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[0.9375rem] leading-7 text-ink-muted">
        {children}
      </div>
    </section>
  );
}
