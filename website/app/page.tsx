import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { FeatureCard } from "@/components/feature-card";
import { Faq } from "@/components/home/faq";
import { Workflow } from "@/components/home/workflow";
import { HeroSection } from "@/components/hero-section";
import { PilotCta } from "@/components/pilot-cta";
import { SectionHeading } from "@/components/section-heading";
import { ArrowRightIcon, ChatIcon, GridIcon, ImpactIcon } from "@/components/ui/icons";
import { OfflineIcon, ReceiptIcon, TimelineIcon } from "@/components/ui/icons";
import { audiences, faqs, problems, solutionPillars } from "@/lib/content";
import { faqJsonLd, jsonLdScript } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/page-metadata";
import { routes } from "@/lib/site-config";

export const metadata: Metadata = pageMetadata({
  title: "Operational recovery for complex, multi-day trips",
  description:
    "TrailComand is operations software for trekking agencies: record trip disruptions, see which itinerary days, suppliers and travelers are affected, and coordinate recovery in one place. In development, with a pilot open to a few agencies.",
  path: "/",
});

const problemIcons = [ChatIcon, GridIcon, ReceiptIcon];
const solutionIcons = [ImpactIcon, TimelineIcon, OfflineIcon];

export default function HomePage() {
  return (
    <main id="main" className="flex-1">
      {/* FAQPage markup mirrors the visible FAQ below — no extra answers. */}
      {jsonLdScript([faqJsonLd(faqs)])}
      <HeroSection />

      {/* Problem ------------------------------------------------------------ */}
      <section className="border-b border-line" aria-labelledby="problem-heading">
        <div className="container-page py-16 lg:py-24">
          <SectionHeading
            eyebrow="The problem"
            titleId="problem-heading"
            title="When a lodge cancels, the whole trip moves."
            description="A multi-day departure is a chain of commitments — a room tonight, a porter tomorrow, a transfer next week. When one link changes, working out what else moved lands on whoever is nearest their phone."
          />

          <div className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-3 lg:mt-14">
            {problems.map((problem, index) => {
              const Icon = problemIcons[index] ?? ChatIcon;
              return (
                <article
                  key={problem.id}
                  className="rounded-card border border-line bg-surface p-6"
                >
                  <div
                    aria-hidden="true"
                    className="flex size-9 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted"
                  >
                    <Icon className="size-[1.15rem]" />
                  </div>
                  <h3 className="mt-4 font-display text-[1.0625rem] font-bold text-navy">
                    {problem.title}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-6 text-ink-muted">
                    {problem.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solution ----------------------------------------------------------- */}
      <section
        aria-labelledby="solution-heading"
        className="border-b border-line bg-surface"
      >
        <div className="container-page py-16 lg:py-24">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow="How TrailComand helps"
              titleId="solution-heading"
              title="Know what changed. See what it affects. Recover."
              description="The TripChange Engine treats a disruption as an operational event with a record, an impact and a follow-up — not a message that scrolls away. Each capability below carries the status it actually has today."
            />
            <ButtonLink
              variant="secondary"
              href={routes.features}
              className="shrink-0 self-start md:self-end"
            >
              All capabilities
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>

          <div className="mt-10 grid gap-4 sm:gap-5 md:grid-cols-3 lg:mt-14">
            {solutionPillars.map((pillar, index) => {
              const Icon = solutionIcons[index] ?? ImpactIcon;
              return (
                <FeatureCard
                  key={pillar.id}
                  body={pillar.body}
                  title={pillar.title}
                  status={pillar.status}
                  footnote={pillar.honesty}
                  icon={<Icon className="size-[1.15rem]" />}
                />
              );
            })}
          </div>

          <p className="mt-6 text-sm text-ink-subtle">
            Full capability list, including what is in development and what is planned, on{" "}
            <Link
              href={routes.features}
              className="rounded font-medium text-teal-ink underline decoration-mint-line underline-offset-2 hover:decoration-teal-ink"
            >
              Features
            </Link>
            .
          </p>
        </div>
      </section>

      {/* How it works ------------------------------------------------------- */}
      <section aria-labelledby="how-heading" className="border-b border-line">
        <div className="container-page py-16 lg:py-24">
          <SectionHeading
            eyebrow="The workflow"
            titleId="how-heading"
            title="Three steps, run by your team."
            description="TrailComand keeps the record and the plan. Decisions, calls and messages stay with the people who know the trip."
          />
          <div className="mt-10 lg:mt-14">
            <Workflow />
          </div>
          <div className="mt-10">
            <ButtonLink variant="secondary" href={routes.features}>
              Read the full workflow
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Audience ----------------------------------------------------------- */}
      <section aria-labelledby="who-heading" className="border-b border-line bg-surface">
        <div className="container-page py-16 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <SectionHeading
              eyebrow="Who it is for"
              titleId="who-heading"
              title="Built for the teams who answer when a trip changes."
              description="If your departures span several days, several suppliers and one group chat, this is the shape of problem TrailComand is designed around."
            />
            <ul className="divide-y divide-line border-y border-line">
              {audiences.map((audience) => (
                <li key={audience.title} className="py-5">
                  <h3 className="font-display text-[1.0625rem] font-bold text-navy">
                    {audience.title}
                  </h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-6 text-ink-muted">
                    {audience.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ ---------------------------------------------------------------- */}
      <section aria-labelledby="faq-heading" className="border-b border-line">
        <div className="container-page py-16 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <SectionHeading
                eyebrow="FAQ"
                titleId="faq-heading"
                title="Straight answers."
                description={
                  <>
                    Something we have not covered?{" "}
                    <Link
                      href={routes.contact}
                      className="rounded font-medium text-teal-ink underline decoration-mint-line underline-offset-2 hover:decoration-teal-ink"
                    >
                      Ask us directly
                    </Link>
                    .
                  </>
                }
              />
            </div>
            <div>
              <Faq />
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA ---------------------------------------------------------- */}
      <PilotCta
        className="border-t-0"
        title="Make your next trip disruption easier to manage."
        description="If a cancelled lodge currently means an afternoon of phone calls and a rebuilt spreadsheet, tell us about it. We are planning the pilot with three agencies and would rather hear your operation than your compliments."
      />
    </main>
  );
}
