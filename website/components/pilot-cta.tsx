import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { pilot } from "@/lib/content";
import { PILOT_CTA_HREF, PILOT_CTA_LABEL } from "@/lib/site-config";

type PilotCtaProps = {
  /** Heading text. Defaults to the pilot offer headline. */
  title?: ReactNode;
  description?: ReactNode;
  /** Heading level, so each page keeps a sensible outline. */
  as?: "h2" | "h3";
  className?: string;
};

/**
 * Shared closing CTA. Deliberately quiet: one offer, one button, no urgency
 * devices. The copy is the approved pilot offer from `lib/content.ts`.
 */
export function PilotCta({
  title = pilot.headline,
  description = "Tell us how your agency coordinates a multi-day trip today. We reply to every enquiry, including the ones we cannot take on.",
  as: Heading = "h2",
  className,
}: PilotCtaProps) {
  return (
    <section
      aria-labelledby="pilot-cta-heading"
      className={cn("border-t border-line bg-surface", className)}
    >
      <div className="container-page py-14 lg:py-20">
        <div className="relative overflow-hidden rounded-xl border border-forest/15 bg-sage/70 px-5 py-10 sm:px-10 sm:py-12 lg:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full border border-forest/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -right-4 size-40 rounded-full border border-forest/10"
          />
          <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-10">
            <div className="max-w-xl">
              <Heading
                id="pilot-cta-heading"
                className="text-[1.625rem] leading-[1.15] font-semibold tracking-[-0.025em] text-forest-ink sm:text-[2rem]"
              >
                {title}
              </Heading>
              <p className="mt-3 text-[0.9375rem] leading-6 text-ink-muted sm:text-base">
                {description}
              </p>
              <p className="mt-3 text-sm font-medium text-forest-ink">
                No credit card required. Just honest feedback.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col md:items-stretch">
              <ButtonLink href={PILOT_CTA_HREF} size="lg" className="w-full sm:w-auto">
                {PILOT_CTA_LABEL}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </ButtonLink>
              <p className="text-center text-xs leading-5 text-ink-muted md:text-left">
                Three agencies · three months
                <br className="hidden md:block" /> · free while in development
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
