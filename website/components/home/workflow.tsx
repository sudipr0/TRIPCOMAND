import { howItWorks } from "@/lib/content";

export function Workflow() {
  return (
    <ol className="relative grid gap-6 md:grid-cols-3 md:gap-8">
      {/* Connector line, desktop only and purely decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-5 right-8 left-8 hidden h-px bg-line-strong md:block"
      />
      {howItWorks.map((step) => (
        <li key={step.step} className="relative">
          <div className="flex items-center gap-3">
            <span className="relative z-10 flex size-10 items-center justify-center rounded-full border border-sage-line bg-sage font-mono text-[0.8125rem] font-semibold text-forest">
              {step.step}
            </span>
            <span className="h-px flex-1 bg-line md:hidden" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-[1.0625rem] font-semibold text-ink">{step.title}</h3>
          <p className="mt-2 text-[0.9375rem] leading-6 text-ink-muted">{step.body}</p>
          {step.note ? (
            <p className="mt-3 inline-flex items-start gap-1.5 text-[0.8125rem] leading-5 text-ink-subtle">
              <span
                aria-hidden="true"
                className="mt-1.5 size-1 shrink-0 rounded-full bg-amber"
              />
              {step.note}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
