import type { Metadata } from "next";

import { productStage } from "@/lib/content";
import { PilotCta } from "@/components/pilot-cta";
import { CheckIcon } from "@/components/ui/icons";
import { pageMetadata } from "@/lib/page-metadata";
import { StatusBadge } from "@/components/ui/status-badge";
import { SectionHeading } from "@/components/section-heading";
import { capabilityStatusNotes, featureSections } from "@/lib/content";
import { WorkflowIllustration } from "@/components/workflow-illustration";

export const metadata: Metadata = pageMetadata({
  title: "Features",
  description:
    "How TrailComand handles disruption recording, impact assessment, itinerary timelines, recovery plans, supplier context, traveler updates and field access — with an honest status for every capability.",
  path: "/features",
});

export default function FeaturesPage() {
  return (
    <main id="main" className="flex-1">
      {/* Intro */}
      <section className="border-b border-line">
        <div className="container-page pt-14 pb-12 sm:pt-16 lg:pt-20 lg:pb-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-16">
            <SectionHeading
              as="h1"
              eyebrow="Features"
              title="Operations that hold together when the itinerary changes."
              description={
                <>
                  <p>
                    A multi-day trip breaks in predictable ways: a lodge cancels, a pass
                    closes, a flight slips, a guide is unavailable. What is unpredictable
                    is how much time it takes to find out who and what is affected.
                  </p>
                  <p className="mt-3">
                    TrailComand is built around that moment. These are the pieces that
                    exist today, the ones still being finished, and what each one is meant
                    to take off your team&rsquo;s plate.
                  </p>
                </>
              }
            />
            <aside className="rounded-card border border-amber-line bg-amber-soft/60 p-5">
              <h2 className="text-sm font-semibold text-ink">{productStage.headline}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{productStage.body}</p>
              <dl className="mt-4 space-y-3 border-t border-amber-line/70 pt-4">
                {capabilityStatusNotes.map((note) => (
                  <div key={note.status}>
                    <dt>
                      <StatusBadge status={note.status} />
                    </dt>
                    <dd className="mt-1.5 text-xs leading-5 text-ink-muted">
                      {note.meaning}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </div>
      </section>

      {/* Workflow illustration */}
      <section
        aria-labelledby="workflow-heading"
        className="border-b border-line bg-surface"
      >
        <div className="container-page py-12 lg:py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              className="max-w-xl"
              eyebrow="A realistic example"
              titleId="workflow-heading"
              title="A weather closure, handled in one place."
            />
            <p className="max-w-sm text-sm leading-6 text-ink-muted">
              One disruption, followed from the moment it is recorded to the point it is
              closed — with its cause and outcome still attached to the trip afterwards.
            </p>
          </div>
          <div className="mt-6">
            <WorkflowIllustration />
          </div>
        </div>
      </section>

      {/* Feature list */}
      <section className="border-b border-line" aria-labelledby="capabilities-heading">
        <div className="container-page py-14 lg:py-20">
          <h2 id="capabilities-heading" className="sr-only">
            Capabilities and their status
          </h2>
          <div className="mx-auto max-w-5xl divide-y divide-line border-y border-line">
            {featureSections.map((feature, index) => (
              <article
                id={feature.id}
                key={feature.id}
                className="scroll-mt-24 py-8 first:pt-8 lg:grid lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:gap-12 lg:py-10"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-ink-subtle">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <StatusBadge status={feature.status} />
                  </div>
                  <h3 className="mt-3 text-[1.25rem] leading-[1.25] font-semibold tracking-[-0.015em] text-ink sm:text-[1.375rem]">
                    {feature.title}
                  </h3>
                </div>
                <dl className="mt-4 space-y-4 lg:mt-0">
                  <div>
                    <dt className="text-xs font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                      The problem
                    </dt>
                    <dd className="mt-1 text-[0.9375rem] leading-6 text-ink-muted">
                      {feature.problem}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                      What TrailComand does
                    </dt>
                    <dd className="mt-1 text-[0.9375rem] leading-6 text-ink">
                      {feature.what}
                    </dd>
                  </div>
                  <div className="flex gap-2 rounded-lg bg-mint/60 p-3">
                    <CheckIcon
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-teal-ink"
                    />
                    <dd className="text-[0.875rem] leading-6 text-navy">
                      {feature.benefit}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* What we do not do */}
      <section
        aria-labelledby="limits-heading"
        className="border-b border-line bg-surface"
      >
        <div className="container-page py-14 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <SectionHeading
              eyebrow="Where we draw the line"
              titleId="limits-heading"
              title="What TrailComand does not do."
              description="Being explicit about the limits is faster than finding them during a pilot."
            />
            <ul className="space-y-4">
              {[
                "It does not book, cancel or confirm with suppliers. There is no supplier-booking integration; your team still makes those calls.",
                "It does not send messages to travelers, guides or suppliers automatically. Drafts stay drafts until a person sends them.",
                "It does not detect disruptions from weather feeds, flights or partner systems. A person records the change.",
                "It is not a booking engine, a payments platform or a marketing site for your trips. It sits alongside the systems you already run.",
              ].map((line) => (
                <li
                  key={line}
                  className="flex gap-3 border-b border-line pb-4 last:border-b-0"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-line-strong"
                  />
                  <p className="text-[0.9375rem] leading-6 text-ink-muted">{line}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <PilotCta
        className="border-t-0"
        title="Use it on one real departure."
        description="During the pilot we set up your own itinerary and you run a live trip through it. That is the only way to know whether this fits how your agency actually works."
      />
    </main>
  );
}
