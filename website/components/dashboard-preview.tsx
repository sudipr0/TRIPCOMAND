import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/ui/icons";

/**
 * Illustrative product preview, built from real HTML/CSS rather than an image.
 *
 * Why not a screenshot: the repository's only real application captures are
 * internal phase evidence containing test-fixture names, record IDs and an
 * internal staff email (see WEBSITE_ASSET_AUDIT.md), so publishing one would
 * either leak internal data or require fabricating a new UI image. Hand-built
 * markup stays crisp at every width, costs no image bytes, cannot shift layout,
 * and cannot be mistaken for a capture of live customer data.
 *
 * ACCESSIBILITY
 * -------------
 * The visual panel is decorative (`aria-hidden`) because it is a picture of an
 * interface — but the same four-step scenario is also rendered as real text in
 * the step strip above and the "what this shows" list below, so nothing is
 * conveyed to sighted users only. Colours never carry state alone: every status
 * has a word next to it.
 *
 * Every name, date, lodge and traveler here is fictional.
 */

const STEPS = [
  {
    n: "01",
    label: "Record the change",
    text: "A lodge cancels night 2. The disruption is logged against the trip and that day, with category and severity.",
  },
  {
    n: "02",
    label: "Review what is affected",
    text: "The day, the linked supplier booking and the six travelers on the trip are listed together.",
  },
  {
    n: "03",
    label: "Assign recovery tasks",
    text: "Tasks get an owner, a due time and a done/not-done state that the team can see.",
  },
  {
    n: "04",
    label: "Prepare the traveler update",
    text: "A draft message is prepared for a person to check and send. Nothing is sent by the system.",
  },
] as const;

const itinerary = [
  { day: "Day 1", place: "Lukla → Phakding", state: "Done" },
  { day: "Day 2", place: "Phakding → Namche", state: "Changed" },
  { day: "Day 3", place: "Namche acclimatisation", state: "At risk" },
  { day: "Day 4", place: "Namche → Tengboche", state: "On plan" },
  { day: "Day 5", place: "Tengboche → Dingboche", state: "On plan" },
] as const;

const stateStyles: Record<(typeof itinerary)[number]["state"], string> = {
  Done: "text-ink-subtle",
  Changed: "text-amber",
  "At risk": "text-danger",
  "On plan": "text-ink-muted",
};

const stateDots: Record<(typeof itinerary)[number]["state"], string> = {
  Done: "bg-teal-strong",
  Changed: "bg-amber",
  "At risk": "bg-danger",
  "On plan": "bg-line-strong",
};

const tasks = [
  { label: "Confirm replacement lodge, Namche", done: true },
  { label: "Notify group of night 2 change", done: true },
  { label: "Re-book porter load for Day 3", done: false },
  { label: "Update costing sheet", done: false },
] as const;

export function DashboardPreview({ className }: { className?: string }) {
  return (
    <figure id="product-preview" className={cn("m-0 scroll-mt-24", className)}>
      <div className="overflow-hidden rounded-[1rem] border border-line bg-surface shadow-[0_22px_44px_-24px_rgba(23,37,31,0.2)]">
        {/* Demo-data banner: impossible to miss, intentionally not subtle. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-line bg-[#f3f9f5] px-3 py-2 text-[0.6875rem] leading-4 text-ink-muted sm:px-4">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#dff3e8] px-1.5 py-px text-[0.625rem] font-semibold tracking-wide text-teal-ink uppercase">
            Illustrative
          </span>
          <span>
            Product preview of the development build — fictional trip, lodge and
            travelers. Not live records.
          </span>
        </p>

        <div aria-hidden="true" className="select-none">
          {/* Window chrome */}
          <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-sunken px-3 py-2 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex gap-1">
                <span className="size-2 rounded-full bg-line-strong" />
                <span className="size-2 rounded-full bg-line-strong" />
                <span className="size-2 rounded-full bg-line-strong" />
              </span>
              <span className="ml-1 truncate font-mono text-[0.75rem] text-ink-subtle">
                trips / TRP-DEMO-014
              </span>
            </div>
            <span className="hidden shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-[0.625rem] font-medium text-ink-subtle sm:inline">
              Demo
            </span>
          </div>

          <div className="grid gap-0 sm:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
            {/* Left column: step 1 + 2 */}
            <div className="min-w-0 border-line p-3 sm:border-r sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                    Trip overview
                  </p>
                  <p className="mt-1 text-[0.9375rem] leading-5 font-semibold text-navy">
                    Everest Base Camp · 12 days
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-ink-muted">
                    Group of 6 · Departs 09 Nov
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-amber-line bg-amber-soft px-2 py-0.5 text-[0.6875rem] font-medium text-amber">
                  1 disruption
                </span>
              </div>

              {/* Step 1: the disruption record */}
              <div className="mt-3 rounded-lg border border-amber-line bg-amber-soft/70 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.6875rem] font-semibold tracking-[0.06em] text-amber uppercase">
                    01 · Disruption recorded
                  </p>
                  <span className="rounded border border-amber-line bg-surface px-1.5 py-0.5 text-[0.6875rem] font-medium text-amber">
                    Executing
                  </span>
                </div>
                <p className="mt-1 text-[0.8125rem] font-medium text-navy">
                  Lodge cancelled night 2 — Namche
                </p>
                <p className="mt-0.5 text-[0.75rem] leading-4 text-ink-muted">
                  Supplier cancellation · Severity high · Day 2
                </p>
              </div>

              {/* Step 2: affected itinerary */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                    02 · Itinerary
                  </p>
                  <p className="text-[0.6875rem] text-ink-subtle">Days 1–5 of 12</p>
                </div>
                <ol className="mt-2 space-y-0">
                  {itinerary.map((item, index) => (
                    <li key={item.day} className="relative flex gap-3 pb-2 last:pb-0">
                      <span className="relative flex w-3 shrink-0 justify-center">
                        {index < itinerary.length - 1 ? (
                          <span className="absolute top-2.5 bottom-[-0.5rem] w-px bg-line-strong" />
                        ) : null}
                        <span
                          className={cn(
                            "relative mt-1 size-2 rounded-full ring-2 ring-surface",
                            stateDots[item.state],
                          )}
                        />
                      </span>
                      <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                        <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
                          <span className="shrink-0 text-[0.75rem] text-ink-subtle">
                            {item.day}
                          </span>
                          <span className="truncate text-[0.8125rem] text-ink">
                            {item.place}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[0.6875rem] font-medium",
                            stateStyles[item.state],
                          )}
                        >
                          {item.state}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Right column: step 2 impact + 3 tasks + 4 draft */}
            <div className="min-w-0 border-t border-line bg-surface-sunken/60 p-3 sm:border-t-0 sm:p-4">
              <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                02 · Impact summary
              </p>
              <ul className="mt-2 space-y-1.5 text-[0.75rem] leading-5 text-ink-muted">
                {[
                  "Itinerary day 2 accommodation",
                  "1 supplier booking linked to the trip",
                  "6 travelers affected",
                ].map((line) => (
                  <li key={line} className="flex gap-1.5">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-subtle" />
                    {line}
                  </li>
                ))}
              </ul>

              <p className="mt-3.5 text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                03 · Recovery tasks
              </p>
              <ul className="mt-2 space-y-1.5">
                {tasks.map((task) => (
                  <li key={task.label} className="flex items-start gap-1.5">
                    <span
                      className={cn(
                        "mt-px flex size-3 shrink-0 items-center justify-center rounded-[3px] border",
                        task.done
                          ? "border-teal-strong bg-teal-strong text-white"
                          : "border-line-strong bg-surface",
                      )}
                    >
                      {task.done ? (
                        <CheckIcon className="size-2" strokeWidth={3} />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "text-[0.75rem] leading-5",
                        task.done ? "text-ink-subtle line-through" : "text-ink",
                      )}
                    >
                      {task.label}
                      <span className="sr-only">{task.done ? " (done)" : " (open)"}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* Step 4: the draft, explicitly not sent */}
              <div className="mt-3 rounded-lg border border-line bg-surface p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                    04 · Traveler update
                  </p>
                  <span className="rounded border border-mint-line bg-mint px-1.5 py-0.5 text-[0.6875rem] font-medium text-teal-ink">
                    Draft
                  </span>
                </div>
                <p className="mt-1.5 text-[0.75rem] leading-[1.2rem] text-ink-muted">
                  &ldquo;Hi all — a small change for night two in Namche. We have
                  confirmed a replacement lodge a few minutes from the original.
                  Tomorrow&rsquo;s start time is unchanged.&rdquo;
                </p>
                        <p className="mt-1.5 text-[0.6875rem] text-ink-subtle">
                  Draft only · a person reviews and sends
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <figcaption className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-ink-muted">
        <span aria-hidden="true" className="mt-1.5 size-1 shrink-0 rounded-full bg-teal-strong" />
        <span>
          Illustrative product preview. The trip, travelers and lodge are fictional demo
          data, not a live record of any agency&rsquo;s operation. TrailComand does not
          contact suppliers or send traveler messages on its own.
        </span>
      </figcaption>

      {/* The readable spine of the preview, kept as real text so the scenario is
          available without parsing the mockup. Placed after the panel so it has
          room to be legible at 360px, where a four-across strip was unreadable. */}
      <ol
        aria-label="The scenario shown in the preview, in four steps"
        className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {STEPS.map((step) => (
          <li key={step.n} className="border-t border-line pt-3">
            <p className="flex items-baseline gap-2">
              <span aria-hidden="true" className="font-mono text-[0.75rem] leading-none text-teal-strong">
                {step.n}
              </span>
              <span className="text-[0.8125rem] leading-5 font-semibold text-ink">
                <span className="sr-only">Step {Number(step.n)}: </span>
                {step.label}
              </span>
            </p>
            <p className="mt-1.5 text-xs leading-5 text-ink-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </figure>
  );
}
