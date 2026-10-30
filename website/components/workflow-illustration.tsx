import { cn } from "@/lib/cn";

/**
 * A compact, horizontal walk-through of one disruption from report to closure,
 * used on the Features page. Illustrative and labelled as such — it mirrors the
 * statuses that exist in the product rather than inventing new ones.
 */
const steps = [
  {
    stage: "Reported",
    label: "Disruption recorded",
    detail: "Weather · Day 3 · high severity",
    tone: "amber",
  },
  {
    stage: "Assessed",
    label: "Impact noted",
    detail: "1 itinerary day, 1 supplier booking",
    tone: "amber",
  },
  {
    stage: "Approved",
    label: "Recovery plan approved",
    detail: "3 tasks with owners and due dates",
    tone: "neutral",
  },
  {
    stage: "Executing",
    label: "Work in progress",
    detail: "Replacement confirmed, 2 tasks open",
    tone: "active",
  },
  {
    stage: "Resolved",
    label: "Closed with a record",
    detail: "Outcome and cause kept on the trip",
    tone: "neutral",
  },
] as const;

const tones = {
  amber: "border-amber-line bg-amber-soft text-amber",
  active: "border-mint-line bg-mint text-teal-ink",
  neutral: "border-line bg-surface-sunken text-ink-muted",
};

export function WorkflowIllustration() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
          Workflow example · illustrative
        </p>
        <p className="text-[0.6875rem] text-ink-subtle">
          One disruption, start to finish
        </p>
      </div>
      <ol
        className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x lg:grid-cols-5 lg:divide-y-0"
        aria-label="Illustrative disruption workflow"
      >
        {steps.map((step) => (
          <li key={step.stage} className="p-4">
            <span
              className={cn(
                "inline-flex rounded border px-1.5 py-0.5 font-mono text-[0.625rem] tracking-wide uppercase",
                tones[step.tone],
              )}
            >
              {step.stage}
            </span>
            <p className="mt-3 text-[0.8125rem] leading-5 font-medium text-ink">
              {step.label}
            </p>
            <p className="mt-1 text-[0.75rem] leading-4 text-ink-muted">{step.detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
