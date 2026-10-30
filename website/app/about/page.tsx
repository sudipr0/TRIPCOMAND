import type { Metadata } from "next";
import Image from "next/image";

import { PilotCta } from "@/components/pilot-cta";
import { pageMetadata } from "@/lib/page-metadata";
import { SectionHeading } from "@/components/section-heading";
import { aboutHonesty, aboutPrinciples, pilotStatus } from "@/lib/content";
import officialLogo from "@/docs/logoforweb.png";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "Why TrailComand exists: giving trekking and adventure travel operators a clearer record, better impact visibility and simpler coordination when a multi-day trip changes. Currently in development.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <main id="main" className="flex-1">
      <section className="border-b border-line">
        <div className="container-page pt-14 pb-12 sm:pt-16 lg:pt-20 lg:pb-16">
          <SectionHeading
            as="h1"
            eyebrow="About"
            title="The plan should survive contact with the mountain."
            description="Most travel software is good at selling a trip and getting it onto the calendar. TrailComand is being built for the harder half: the days after departure, when the plan has to change and someone has to keep six people, two guides and a lodge in agreement."
          />

          {/*
              Brand artwork. The original brand image is used directly, with no
              recolouring or cropping. It is presented on a white surface so the
              original forest-green, gold and blue details remain legible.
          */}
          <figure className="mt-12 max-w-xl border-t border-line pt-8">
            <div className="inline-flex rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
              <Image
                src={officialLogo}
                alt="The TrailComand brand mark: a mountain peak with a compass rose above the TrailComand wordmark."
                sizes="(min-width: 640px) 20rem, 70vw"
                className="h-auto w-full max-w-[20rem]"
              />
            </div>
            <figcaption className="mt-4 text-xs leading-5 text-ink-subtle">
              The current brand artwork, shown here in its original green palette and
              proportions. The wordmark is set as &ldquo;Trailcomand&rdquo;; this site
              uses &ldquo;TrailComand&rdquo; in running text.
            </figcaption>
          </figure>
        </div>
      </section>

      <section aria-labelledby="why-heading" className="border-b border-line bg-surface">
        <div className="container-page py-14 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <SectionHeading
              eyebrow="Why it matters"
              titleId="why-heading"
              className="lg:sticky lg:top-24 lg:self-start"
              title="A disruption is an operations problem before it is a customer-service problem."
            />
            <div className="max-w-xl space-y-5 text-[1.0625rem] leading-8 text-ink-muted">
              <p>
                On a multi-day trip, everything is connected. A closed pass pushes
                tomorrow&rsquo;s walking day. A walking day that runs long means the lodge
                is expecting the group at the wrong time. A delayed transfer means the
                guide is standing in the wrong village. Each change is small; together
                they consume an afternoon.
              </p>
              <p>
                In most agencies that work is done well, by experienced people, using
                whatever is at hand — phone calls, a group chat, a spreadsheet, a memory
                of which lodge manager is quickest to answer. The weakness is not the
                people. It is that the record of <em>what changed and why</em> dissolves
                as soon as the issue is solved.
              </p>
              <p>
                That record matters later: when the group asks what happened, when a
                partner disputes a charge, when a supplier relationship is reviewed, or
                when the same pass closes again next season. TrailComand exists to make
                that record a by-product of doing the work.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="principles-heading" className="border-b border-line">
        <div className="container-page py-14 lg:py-20">
          <SectionHeading
            titleId="principles-heading"
            eyebrow="What we are aiming for"
            title="Three outcomes, in order."
            description="If the product only ever delivered these, it would be worth building."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-3 lg:gap-5">
            {aboutPrinciples.map((principle, index) => (
              <article
                key={principle.title}
                className="rounded-card border border-line bg-surface p-6"
              >
                <span className="font-mono text-xs text-ink-subtle">0{index + 1}</span>
                <h3 className="mt-3 text-[1.0625rem] font-semibold text-ink">
                  {principle.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-6 text-ink-muted">
                  {principle.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="where-heading"
        className="border-b border-line bg-surface"
      >
        <div className="container-page py-14 lg:py-20">
          <div className="mx-auto max-w-3xl">
            <SectionHeading
              eyebrow="Where we are"
              titleId="where-heading"
              title="Early, small, and honest about it."
              description="The product is in development and the company behind it is just starting. That has some straightforward consequences for this website."
            />
            <dl className="mt-8 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
              {[
                { label: "Product", value: "In development" },
                { label: "Pilot", value: pilotStatus.label },
                { label: "Public sign-up", value: "None yet" },
              ].map((item) => (
                <div key={item.label} className="bg-surface px-4 py-3">
                  <dt className="text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                    {item.label}
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-display text-sm font-semibold text-navy">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-teal" />
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            <ul className="mt-8 space-y-4 border-t border-line pt-6">
              {aboutHonesty.map((line) => (
                <li key={line} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2.5 size-1.5 shrink-0 rounded-full bg-amber"
                  />
                  <p className="text-[0.9375rem] leading-7 text-ink-muted">{line}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 rounded-card border border-line bg-canvas p-5 text-[0.9375rem] leading-7 text-ink">
              What we can promise is attention: the first few agencies will shape what
              gets built next, and we would rather hear a blunt problem report during a
              pilot than a polite compliment after one.
            </p>
          </div>
        </div>
      </section>

      <PilotCta
        className="border-t-0"
        title="If this sounds like your operation, say hello."
        description="We are looking for three trekking agencies to work with closely while the product is still being built. A short description of your departures is enough to start."
      />
    </main>
  );
}
