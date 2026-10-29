import type { Metadata } from "next";

import { pilot } from "@/lib/content";
import { CheckIcon } from "@/components/ui/icons";
import { pageMetadata } from "@/lib/page-metadata";
import { ContactForm } from "@/components/contact-form";
import { SectionHeading } from "@/components/section-heading";
import { contactEmail, contactFormEndpoint } from "@/lib/site-config";

export const metadata: Metadata = pageMetadata({
  title: "Request a pilot",
  description:
    "Tell us how your trekking agency coordinates multi-day trips and request one of three free three-month TrailComand pilot places.",
  path: "/contact",
});

export default function ContactPage() {
  // Server-side read: the endpoint is a public form identifier, never a token.
  // When it is absent the form switches to the documented mailto fallback and
  // says so, rather than pretending an enquiry was delivered.
  const endpoint = contactFormEndpoint;

  return (
    <main id="main" className="flex-1">
      <div className="container-page pt-14 pb-16 sm:pt-16 lg:pt-20 lg:pb-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <SectionHeading
              as="h1"
              eyebrow="Request a pilot"
              title="Tell us about your trips."
              description="We are looking for three trekking agencies to pilot TrailComand for three months, free. Use this form to describe how you coordinate multi-day trips today and why the pilot interests you."
            />

            <div className="mt-8 rounded-card border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold text-ink">What happens next</h2>
              <ol className="mt-3 space-y-2.5">
                {[
                  "We read your enquiry ourselves — there is no sales sequence.",
                  "If it looks like a fit, we propose a short call to understand your operation.",
                  "You get an honest answer on fit, and the scope of the pilot in writing before anything is set up.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-sage font-mono text-[0.6875rem] text-forest">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-6 text-ink-muted">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-semibold text-ink">Prefer email?</h2>
              <p className="mt-1.5 text-sm leading-6 text-ink-muted">
                Write to{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="font-medium break-all text-forest underline decoration-sage-line underline-offset-2 hover:decoration-forest"
                >
                  {contactEmail}
                </a>{" "}
                with the same details.
              </p>
            </div>

            <aside className="mt-8 space-y-2 border-t border-line pt-5 text-xs leading-5 text-ink-subtle">
              <h2 className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
                How we use your details
              </h2>
              <p>
                Your name, agency, email address and message are used only to reply to
                this enquiry and, if you proceed, to discuss the pilot. We do not sell or
                share them, and we do not add you to a marketing list. Ask us to delete
                your enquiry at any time by replying to our message.
              </p>
              <p>
                {/* Setup transparency: only surfaced when the form is not wired
                    to a provider, so visitors know exactly what will happen. */}
                {endpoint
                  ? "This form is delivered through a third-party form service that processes the submission on our behalf."
                  : "This site is not yet connected to a form service. Submitting will open your own email app with the enquiry pre-filled; nothing is sent until you send it."}
              </p>
            </aside>
          </div>

          <div className="lg:pt-2">
            <ContactForm endpoint={endpoint} contactEmail={contactEmail} />

            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {pilot.included.slice(0, 2).map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-5 text-ink-subtle">
                  <CheckIcon
                    className="mt-0.5 size-3.5 shrink-0 text-forest"
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
