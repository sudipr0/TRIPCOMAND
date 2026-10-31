import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { pilot } from "@/lib/content";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
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
        <div className="relative overflow-hidden rounded-[1.25rem] border border-line bg-white px-5 py-10 shadow-[0_22px_38px_-28px_rgba(23,37,31,0.2)] sm:px-10 sm:py-12 lg:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(8,122,80,0.12),transparent_34%)]"
          />
          <div className="relative grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12">
            <div className="max-w-xl">
              <h2
                id={headingId}
                className="font-display text-[1.625rem] leading-[1.15] font-bold tracking-[-0.028em] text-navy sm:text-[2rem]"
              >
                {title}
              </h2>
              <p className="mt-3 text-[0.9375rem] leading-6 text-ink-muted sm:text-base">
                {description}
              </p>
              <p className="mt-3 text-sm font-medium text-teal-ink">
                No credit card required. Just honest feedback.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col md:items-stretch">
              <ButtonLink
                size="lg"
                variant="primary"
                href={PILOT_CTA_HREF}
                className="w-full sm:w-auto"
              >
                {PILOT_CTA_LABEL}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </ButtonLink>
              <p className="text-center text-xs leading-5 text-ink-subtle md:text-left">
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
