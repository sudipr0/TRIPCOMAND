import Link from "next/link";
import type { Metadata } from "next";

import { pilot } from "@/lib/content";
import { PilotCta } from "@/components/pilot-cta";
import { pageMetadata } from "@/lib/page-metadata";
import { ButtonLink } from "@/components/ui/button";
import { PILOT_CTA_LABEL, routes } from "@/lib/site-config";
import { SectionHeading } from "@/components/section-heading";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "TrailComand pricing during development: a free three-month pilot for three trekking agencies. No credit card required, honest feedback requested. Commercial pricing is agreed after the pilot.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <main id="main" className="flex-1">
      {/* Intro + pilot card */}
      <section className="border-b border-line">
        <div className="container-page pt-14 pb-14 sm:pt-16 lg:pt-20 lg:pb-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
            <div>
              <SectionHeading
                as="h1"
                eyebrow="Pricing"
                title="One pilot, three agencies, no fee."
                description="TrailComand is in development, so there is nothing to buy yet. Instead of a price list with invented tiers, here is exactly what the pilot covers and what we ask in return."
              />

              <dl className="mt-8 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-card border border-line bg-line">
                {[
                  { label: "Cost", value: "£0" },
                  { label: "Duration", value: "3 months" },
                  { label: "Agencies", value: "3" },
                ].map((item) => (
                  <div key={item.label} className="bg-surface px-3 py-4 text-center">
                    <dt className="text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-forest-ink">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-6 max-w-md text-sm leading-6 text-ink-subtle">
                There are no monthly plans, per-user fees, discounts or enterprise terms
                published here, because none have been decided. When they are, they will
                appear on this page.
              </p>
            </div>

            {/* Pilot offer card */}
            <div className="rounded-xl border border-forest/20 bg-surface p-6 shadow-card sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="inline-flex items-center gap-2 rounded-full border border-sage-line bg-sage px-3 py-1 text-xs font-medium text-forest-ink">
                  <span className="size-1.5 rounded-full bg-forest" aria-hidden="true" />
                  Development pilot
                </p>
                <p className="text-sm text-ink-muted">No credit card required</p>
              </div>

              {/* The approved offer sentence, rendered verbatim from lib/content.ts. */}
              <h2 className="mt-5 text-[1.375rem] leading-[1.25] font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
                {pilot.headline}
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-6 text-ink-muted">
                For three trekking agencies who will use TrailComand on real departures
                and tell us plainly what works and what does not.
              </p>

              <h3 className="mt-6 text-xs font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                What the pilot includes
              </h3>
              <ul className="mt-3 space-y-2.5">
                {pilot.included.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <CheckIcon
                      className="mt-0.5 size-4 shrink-0 text-forest"
                      aria-hidden="true"
                    />
                    <span className="text-[0.9375rem] leading-6 text-ink">{item}</span>
                  </li>
                ))}
              </ul>

              <h3 className="mt-6 text-xs font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                What we ask from you
              </h3>
              <ul className="mt-3 space-y-2.5">
                {pilot.expectations.map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1 shrink-0 rounded-full bg-ink-subtle"
                    />
                    <span className="text-[0.9375rem] leading-6 text-ink-muted">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <ButtonLink href={routes.contact} size="lg" className="mt-7 w-full">
                {PILOT_CTA_LABEL}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </ButtonLink>
              <p className="mt-3 text-center text-xs leading-5 text-ink-subtle">
                Pilot terms, scope and any obligations are agreed in writing before setup.
                Nothing here is a contract.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section
        aria-labelledby="process-heading"
        className="border-b border-line bg-surface"
      >
        <div className="container-page py-14 lg:py-20">
          <SectionHeading
            eyebrow="How the pilot starts"
            titleId="process-heading"
            title="A short conversation, then a decision."
            description="There is no application form with hidden criteria. We talk, we tell you honestly whether we think it fits, and you decide."
          />
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {pilot.conversation.map((step) => (
              <li key={step.step} className="border-t border-line-strong pt-4">
                <span className="font-mono text-xs text-forest">{step.step}</span>
                <h3 className="mt-2 text-[1.0625rem] font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-6 text-ink-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* After the pilot */}
      <section aria-labelledby="after-heading" className="border-b border-line">
        <div className="container-page py-14 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <SectionHeading
              eyebrow="After the pilot"
              titleId="after-heading"
              title="Pricing, once it is real."
            />
            <div className="max-w-xl space-y-4">
              <p className="rounded-card border border-line bg-surface p-5 text-[1.0625rem] leading-7 font-medium text-forest-ink">
                {pilot.pricingNote}
              </p>
              <p className="text-[0.9375rem] leading-6 text-ink-muted">
                Different agencies run very different operations — one departure a month
                or fifteen, two coordinators or twenty. Charging before we understand that
                would be guesswork, so we would rather agree terms with the first agencies
                after they have actually used the platform.
              </p>
              <p className="text-[0.9375rem] leading-6 text-ink-muted">
                Nothing in the pilot obliges you to continue, and nothing in it gives you
                a fixed future price.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Common questions */}
      <section
        aria-labelledby="pricing-faq-title"
        className="border-b border-line bg-surface"
      >
        <div className="container-page py-14 lg:py-20">
          <SectionHeading
            as="h2"
            className="mb-8"
            eyebrow="Questions"
            title="About the offer."
            titleId="pricing-faq-title"
          />
          <div className="mx-auto max-w-3xl divide-y divide-line border-y border-line">
            {[
              {
                q: "Is the pilot really free?",
                a: "Yes. There is no fee for the three-month pilot and no card is collected. We are asking for feedback, not payment.",
              },
              {
                q: "Why only three agencies?",
                a: "Because a small number of agencies can be supported closely while the product is still changing. If your agency is a good fit and the places are taken, we will say so rather than pretend otherwise.",
              },
              {
                q: "What happens to my data?",
                a: "We only ask for what is needed to set up and run the pilot, and we will explain the handling arrangements before anything is loaded. You can ask us to delete it at any point.",
              },
              {
                q: "Do you offer a plan for larger operators?",
                a: "Not yet. There are no published tiers or enterprise terms. If your operation is large or unusual, describe it on the contact form and we will discuss it directly.",
              },
            ].map((item) => (
              <div key={item.q} className="py-5">
                <h3 className="text-base font-medium text-ink">{item.q}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-6 text-ink-muted">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-3xl text-sm text-ink-subtle">
            More product questions are answered in the{" "}
            <Link
              href={routes.home}
              className="font-medium text-forest underline decoration-sage-line underline-offset-2 hover:decoration-forest"
            >
              homepage FAQ
            </Link>
            ; capability details are on{" "}
            <Link
              href={routes.features}
              className="font-medium text-forest underline decoration-sage-line underline-offset-2 hover:decoration-forest"
            >
              Features
            </Link>
            .
          </p>
        </div>
      </section>

      <PilotCta
        className="border-t-0"
        title="Three places. Tell us about your trips."
        description="Describe the departures you run and where coordination gets hard. If the pilot is right for you, we will say so; if it is not, we will tell you that too."
      />
    </main>
  );
}
