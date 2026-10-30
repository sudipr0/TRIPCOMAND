import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/contact-form";
import { SectionHeading } from "@/components/section-heading";
import { CheckIcon } from "@/components/ui/icons";
import { pilot, pilotStatus } from "@/lib/content";
import { pageMetadata } from "@/lib/page-metadata";
import { contactEmail, contactFormEndpoint, routes } from "@/lib/site-config";

export const metadata: Metadata = pageMetadata({
  title: "Request a pilot",
  description:
    "Tell us how your trekking agency coordinates multi-day trips and ask about the TrailComand development pilot. We reply to every enquiry.",
  path: "/contact",
});

export default function ContactPage() {
  // Both values are resolved at build time from public environment variables.
  // Formats the visitor cannot use are treated as absent — see lib/site-config.
  const endpoint = contactFormEndpoint;
  const email = contactEmail;

  const deliveryNote = endpoint
    ? "This form is delivered through a third-party form service that processes the submission on our behalf."
    : email
      ? "This site is not connected to a form service. Submitting opens your own email app with the enquiry pre-filled; nothing is sent until you send it."
      : "No contact channel is connected to this site yet, so online enquiries are temporarily unavailable.";

  return (
    <main id="main" className="flex-1">
      <div className="container-page pt-12 pb-16 sm:pt-14 lg:pt-16 lg:pb-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <SectionHeading
              as="h1"
              eyebrow="Request a pilot"
              title="Tell us about your trips."
              description="Use this form to describe how you coordinate multi-day trips today. That is what we use to judge whether the pilot is a fit — there is no sales sequence and no obligation."
            />

            <div className="mt-6 flex gap-3 rounded-card border border-line bg-surface-sunken/70 p-4">
              <span
                aria-hidden="true"
                className="mt-1.5 size-2 shrink-0 rounded-full bg-teal"
              />
              <p className="text-sm leading-6 text-ink-muted">
                <span className="font-semibold text-navy">Pilot status: {pilotStatus.label}. </span>
                {pilotStatus.body}
              </p>
            </div>

            <div className="mt-8 rounded-card border border-line bg-surface p-5">
              <h2 className="font-display text-sm font-semibold text-navy">
                What happens next
              </h2>
              <ol className="mt-3 space-y-2.5">
                {[
                  "We read your enquiry ourselves — there is no sales sequence.",
                  "If it looks like a fit, we propose a short call to understand your operation.",
                  "You get an honest answer on fit, and the scope of the pilot in writing before anything is set up.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-mint font-mono text-[0.6875rem] text-teal-ink">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-6 text-ink-muted">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Only offered when a real, monitored mailbox is configured. */}
            {email ? (
              <div className="mt-6">
                <h2 className="font-display text-sm font-semibold text-navy">Prefer email?</h2>
                <p className="mt-1.5 text-sm leading-6 text-ink-muted">
                  Write to{" "}
                  <a
                    href={`mailto:${email}`}
                    className="font-medium break-all text-teal-ink underline decoration-mint-line underline-offset-2 hover:decoration-teal-ink"
                  >
                    {email}
                  </a>{" "}
                  with the same details.
                </p>
              </div>
            ) : (
              /* No mailbox and no form service are configured — say who can
                 unblock this rather than leaving the page as a dead end. */
              <div className="mt-6">
                <h2 className="font-display text-sm font-semibold text-navy">
                  Contact channel not live yet
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-ink-muted">
                  This page has no connected form service and no confirmed public
                  mailbox, so it cannot accept an enquiry right now. The site owner
                  enables it by setting{" "}
                  <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem] text-navy">
                    NEXT_PUBLIC_CONTACT_FORM_ENDPOINT
                  </code>{" "}
                  or a monitored{" "}
                  <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem] text-navy">
                    NEXT_PUBLIC_CONTACT_EMAIL
                  </code>{" "}
                  (see <code className="font-mono text-[0.8125rem]">website/.env.example</code>
                  ). We are not going to print an address we cannot prove receives mail.
                </p>
              </div>
            )}

            <aside className="mt-8 space-y-2 border-t border-line pt-5 text-xs leading-5 text-ink-subtle">
              <h2 className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
                How we use your details
              </h2>
              <p>
                Your name, agency, email and the notes you write here are used only to
                reply to this enquiry and, if you proceed, to discuss the pilot. We do not
                sell or share them, and there is no marketing list. Ask us to delete your
                enquiry at any time by replying to our message.
              </p>
              <p>{deliveryNote}</p>
              <p>
                Read the{" "}
                <Link
                  href={routes.privacy}
                  className="rounded font-medium text-teal-ink underline decoration-mint-line underline-offset-2 hover:decoration-teal-ink"
                >
                  privacy details
                </Link>{" "}
                for the full picture, including what this site does not collect.
              </p>
            </aside>
          </div>

          <div className="lg:pt-2">
            <ContactForm
              endpoint={endpoint}
              contactEmail={email}
              privacyHref={routes.privacy}
            />

            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {pilot.included.slice(0, 2).map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-5 text-ink-subtle">
                  <CheckIcon
                    className="mt-0.5 size-3.5 shrink-0 text-teal-ink"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
