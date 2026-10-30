import type { Metadata } from "next";
import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { pageMetadata } from "@/lib/page-metadata";
import { contactEmail, contactFormEndpoint, routes } from "@/lib/site-config";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description:
    "What this TrailComand marketing website does and does not collect, how pilot enquiries are handled, and how to have your details removed.",
  path: "/privacy",
});

const LAST_UPDATED = "29 October 2026";

export default function PrivacyPage() {
  const usesFormService = Boolean(contactFormEndpoint);

  return (
    <main id="main" className="flex-1">
      <div className="container-page py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            as="h1"
            eyebrow="Privacy"
            title="What this website does with your information."
            description={`Last updated ${LAST_UPDATED}. This page describes this marketing website only — not the TrailComand application, which is still in development and has no public users.`}
          />

          <div className="mt-10 space-y-10">
            <Section title="The short version">
              <ul className="space-y-2.5">
                {[
                  "This site runs no analytics, no advertising pixels and no session recording.",
                  "It sets no cookies of its own. Your browser may cache pages; that is all.",
                  "The only information we receive is what you choose to type into the pilot form.",
                  "We use it to reply to your enquiry. Nothing else.",
                ].map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-2.5 size-1.5 shrink-0 rounded-full bg-teal-strong"
                    />
                    <span className="text-[0.9375rem] leading-7 text-ink-muted">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="What we collect">
              <p>
                If you submit the pilot form, we receive the details you enter: your name,
                agency name, work email address, and optionally your agency website, an
                indication of your operational scale, and a description of your main
                coordination challenge.
              </p>
              <p>
                We do not ask for, and do not want, traveler personal data, passport or
                health information, financial details, or anything about individuals you
                work with. Please do not include that in the free-text field.
              </p>
            </Section>

            <Section title="How enquiries are delivered">
              <p>
                {usesFormService
                  ? "The pilot form is delivered through a third-party form service (Formspree). Your submission is transmitted to and stored by that service so it can be passed to us. It is subject to that provider's own privacy terms in addition to this notice."
                  : "This website is not currently connected to a form delivery service. If a monitored email address is shown on the contact page, submitting the form opens your own email application with the enquiry pre-filled — the message is sent from your mail client, not from this website. If no channel is shown, online enquiries are simply unavailable."}
              </p>
              <p>
                Because the site is hosted as a static deployment, the hosting provider
                processes standard technical request data (such as IP address and
                user-agent) to serve pages and protect the service. We do not build
                visitor profiles from it.
              </p>
            </Section>

            <Section title="What we do not do">
              <ul className="space-y-2.5">
                {[
                  "We do not sell, rent or share your details with third parties for marketing.",
                  "We do not add you to a newsletter or drip sequence.",
                  "We do not use cookies for tracking or advertising.",
                  "We do not embed third-party trackers, chat widgets or heatmaps.",
                ].map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink-subtle"
                    />
                    <span className="text-[0.9375rem] leading-7 text-ink-muted">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="How long we keep it">
              <p>
                Enquiries are kept while we are discussing a pilot and for a short period
                afterwards so we can follow up if you asked us to. If you ask us to delete
                your enquiry, we will do so and confirm it.
              </p>
            </Section>

            <Section title="Your choices">
              <p>
                You can ask us what we hold about you, ask for it to be corrected, or ask
                for it to be deleted. Reply to any message from us, or use the{" "}
                <Link
                  href={routes.contact}
                  className="rounded font-medium text-teal-ink underline decoration-mint-line underline-offset-2 hover:decoration-teal-ink"
                >
                  contact page
                </Link>
                {contactEmail ? (
                  <>
                    {" "}
                    or email{" "}
                    <a
                      href={`mailto:${contactEmail}`}
                      className="font-medium break-all text-teal-ink underline decoration-mint-line underline-offset-2 hover:decoration-teal-ink"
                    >
                      {contactEmail}
                    </a>
                  </>
                ) : null}
                .
              </p>
            </Section>

            <Section title="About this notice">
              <p>
                This is a plain description of how a small, early-stage product handles
                enquiry data. It is written to be accurate rather than to claim
                certification or compliance with any particular regime. If you need a
                formal data processing agreement as part of a pilot, ask and we will
                discuss it directly.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`h-${slug(title)}`}>
      <h2
        id={`h-${slug(title)}`}
        className="text-lg font-semibold tracking-[-0.015em] text-ink"
      >
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[0.9375rem] leading-7 text-ink-muted">
        {children}
      </div>
    </section>
  );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
