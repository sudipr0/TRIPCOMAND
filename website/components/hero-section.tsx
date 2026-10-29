import { ArrowRightIcon } from "@/components/ui/icons";
import { DashboardPreview } from "@/components/dashboard-preview";
import { ButtonAnchor, ButtonLink } from "@/components/ui/button";
import { loginUrl, PILOT_CTA_HREF, PILOT_CTA_LABEL } from "@/lib/site-config";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* Faint grid, purely decorative. Masked so it never fights the text. */}
      <div
        aria-hidden="true"
        className="bg-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
      />
      <div className="container-page relative pt-12 pb-12 sm:pt-16 lg:pt-16 lg:pb-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 xl:gap-16">
          <div className="animate-rise max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-sage-line bg-sage px-3 py-1 text-xs font-medium text-forest-ink">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-forest" />
              In development · onboarding pilot agencies
            </p>

            <h1 className="mt-5 text-[2.125rem] leading-[1.08] font-semibold tracking-[-0.035em] text-ink sm:text-[2.75rem] lg:text-[3.25rem] xl:text-[3.5rem]">
              The Operational Recovery Layer for Complex, Multi-Day Trips.
            </h1>

            <p className="mt-5 text-[1.0625rem] leading-7 text-ink-muted sm:text-lg sm:leading-8">
              TrailComand helps trekking agencies manage disruptions, coordinate field
              operations, and keep travelers informed—without the WhatsApp chaos.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink size="lg" href={PILOT_CTA_HREF} className="w-full sm:w-auto">
                {PILOT_CTA_LABEL}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonAnchor
                size="lg"
                href={loginUrl}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Login
              </ButtonAnchor>
            </div>

            <p className="mt-4 text-sm text-ink-subtle">
              Designed for trekking and adventure travel operations.
            </p>
          </div>

          <div className="animate-rise-delayed min-w-0 lg:-mr-4 xl:-mr-8">
            <DashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
