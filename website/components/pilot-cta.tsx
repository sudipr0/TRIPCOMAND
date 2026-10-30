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
  headingId?: string;
  className?: string;
};

/**
 * Shared closing CTA. Deliberately quiet: one offer, one button, no urgency
 * devices. The copy is the approved pilot offer from `lib/content.ts`.
 */
export function PilotCta({
  title = pilot.headline,
  description = "Tell us how your agency coordinates a multi-day trip today. We reply to every enquiry, including the ones we cannot take on.",
  headingId = "pilot-cta-heading",
  className,
}: PilotCtaProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn("border-t border-line bg-canvas", className)}
    >
      <div className="container-page py-14 lg:py-20">
        <div className="relative overflow-hidden rounded-xl bg-navy px-5 py-10 text-on-navy sm:px-10 sm:py-12 lg:px-14">
          <div
            aria-hidden="true"
            className="bg-grid-dark pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_120%_at_100%_0%,black,transparent)]"
          />
          <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12">
            <div className="max-w-xl">
              <h2
                id={headingId}
                className="font-display text-[1.625rem] leading-[1.15] font-bold tracking-[-0.028em] text-white sm:text-[2rem]"
              >
                {title}
              </h2>
              <p className="mt-3 text-[0.9375rem] leading-6 text-on-navy-muted sm:text-base">
                {description}
              </p>
              <p className="mt-3 text-sm font-medium text-teal-on-navy">
                No credit card required. Just honest feedback.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col md:items-stretch">
              <ButtonLink
                href={PILOT_CTA_HREF}
                size="lg"
                variant="inverse"
                className="w-full sm:w-auto"
              >
                {PILOT_CTA_LABEL}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </ButtonLink>
              <p className="text-center text-xs leading-5 text-on-navy-subtle md:text-left">
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
