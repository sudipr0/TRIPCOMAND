import { faqs } from "@/lib/content";

/**
 * FAQ using native <details>/<summary>: keyboard accessible, works without
 * JavaScript, and the answer text is in the initial HTML for crawlers.
 */
export function Faq() {
  return (
    <div className="divide-y divide-line border-y border-line">
      {faqs.map((faq, index) => (
        <details key={faq.question} className="group" open={index === 0}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 text-left [&::-webkit-details-marker]:hidden">
            <h3 className="text-base font-medium text-ink sm:text-[1.0625rem]">
              {faq.question}
            </h3>
            <span
              aria-hidden="true"
              className="relative mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-transform duration-200 group-open:rotate-45"
            >
              <span className="absolute h-px w-2.5 bg-current" />
              <span className="absolute h-2.5 w-px bg-current" />
            </span>
          </summary>
          <p className="max-w-2xl pb-6 text-[0.9375rem] leading-7 text-ink-muted">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
