import { PREVIEW_ANCHOR } from "@/lib/site-config";
import { ButtonLink } from "@/components/ui/button";
import { DashboardPreview } from "@/components/dashboard-preview";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import { loginUrl, PILOT_CTA_HREF, PILOT_CTA_LABEL } from "@/lib/site-config";

/**
 * Hero.
 *
 * Midnight Navy band so the product preview reads as a lit panel on a dark
 * surface (the same relationship the app uses), with the positioning headline
 * in Manrope. The tagline "When plans change, stay in command." is the
 * supporting line under the H1.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(79,209,200,0.12),transparent_32%),linear-gradient(135deg,#0e1a2a_0%,#12273d_50%,#0b1322_100%)] text-on-navy">
      {/* Faint dot grid, purely decorative and masked away from the text. */}
      <div
        aria-hidden="true"
        className="bg-grid-dark pointer-events-none absolute inset-0 [mask-image:radial-gradient(80%_70%_at_75%_10%,black,transparent)]"
      />
      <div className="container-page relative pt-12 pb-14 sm:pt-16 lg:pt-20 lg:pb-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14 xl:gap-20">
          <div className="animate-rise max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-teal-on-navy"
              />
              <span className="text-xs font-medium tracking-[0.14em] text-on-navy-subtle uppercase">
                in development
              </span>
            </div>

            <h1 className="mt-6 font-display text-[2.125rem] leading-[1.06] font-extrabold tracking-[-0.035em] text-white sm:text-[2.875rem] lg:text-[3.25rem] xl:text-[3.5rem]">
              The operational recovery layer for complex, multi-day trips.
            </h1>

            <p className="mt-4 font-display text-lg leading-7 font-medium text-teal-on-navy sm:text-xl sm:leading-8">
              When plans change, stay in command.
            </p>

            <p className="mt-5 text-[1.0625rem] leading-7 text-on-navy-muted sm:text-lg sm:leading-8">
              TrailComand gives trekking agencies one place to record what changed, see
              which itinerary days and suppliers are affected, and coordinate recovery
              work before the next issue spreads.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink
                size="lg"
                variant="inverse"
                href={PILOT_CTA_HREF}
                className="w-full sm:w-auto"
              >
                {PILOT_CTA_LABEL}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </ButtonLink>
              <a
                href={PREVIEW_ANCHOR}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-navy-line px-5 text-base font-medium text-white transition-colors hover:border-teal-on-navy/60 hover:bg-navy-raised focus-ring sm:w-auto"
              >
                See a disruption handled
                <span className="sr-only"> (jumps to the product preview)</span>
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-on-navy-muted">
              {[
                "Trip disruption record",
                "Impact over the itinerary",
                "Recovery coordination",
              ].map((point) => (
                <li key={point} className="flex items-center gap-1.5">
                  <CheckIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-teal-on-navy"
                  />
                  {point}
                </li>
              ))}
            </ul>

            {loginUrl ? (
              <p className="mt-5 text-sm text-on-navy-subtle">
                Already a pilot agency?{" "}
                <a
                  rel="noopener"
                  href={loginUrl}
                  className="rounded font-medium text-white underline decoration-teal-on-navy/70 underline-offset-2 hover:decoration-white"
                >
                  Log in
                </a>
                .
              </p>
            ) : null}
          </div>

          <div className="animate-rise-delayed min-w-0">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
