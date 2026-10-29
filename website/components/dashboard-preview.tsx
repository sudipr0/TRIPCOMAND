import { cn } from "@/lib/cn";
import { CheckIcon } from "@/components/ui/icons";

/**
 * Illustrative product mockup, built from real HTML/CSS rather than an image.
 *
 * Reasons: it stays crisp at every width, costs no image bytes, cannot be
 * confused with a screenshot of live data, and is fully labelled as demo data.
 *
 * Everything shown is invented for illustration — the agency, travelers,
 * lodge, dates and costs are fictional. It is rendered as a decorative figure
 * for assistive technology (`aria-hidden`), with a visible demo-data banner and
 * a single descriptive caption so screen-reader users get the same context a
 * sighted user gets from the caption text.
 */

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

const tasks = [
  { label: "Confirm replacement lodge, Namche", done: true },
  { label: "Notify group of night-2 change", done: true },
  { label: "Re-book porter load for Day 3", done: false },
  { label: "Update costing sheet", done: false },
] as const;

export function DashboardPreview({ className }: { className?: string }) {
  return (
    <figure className={cn("m-0", className)}>
      <div className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-raised">
        {/* Demo-data banner: impossible to miss, intentionally not subtle. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-amber-line bg-amber-soft px-3 py-1.5 text-[0.6875rem] leading-4 text-amber sm:px-4">
          <span className="font-semibold tracking-wide uppercase">
            Illustrative demo data
          </span>
          <span aria-hidden="true">—</span>
          <span>Fictional trip, lodge and travelers. Not live records.</span>
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
              <span className="ml-1 truncate font-mono text-[0.6875rem] text-ink-subtle">
                app.trailcomand.com / trips / TRP-DEMO-014
              </span>
            </div>
            <span className="hidden shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-[0.625rem] font-medium text-ink-subtle sm:inline">
              Demo
            </span>
          </div>

          <div className="grid gap-0 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {/* Left column */}
            <div className="min-w-0 border-line p-3 sm:p-4 sm:border-r">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.625rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                    Trip overview
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">
                    Everest Base Camp · 12 days
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
                    Group of 6 · Guide: A. Sherpa · Departs 09 Nov
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-amber-line bg-amber-soft px-2 py-0.5 text-[0.625rem] font-medium text-amber">
                  1 disruption
                </span>
              </div>

              {/* Itinerary timeline */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[0.625rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                    Itinerary
                  </p>
                  <p className="text-[0.625rem] text-ink-subtle">Days 1–5 of 12</p>
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
                            item.state === "Changed"
                              ? "bg-amber"
                              : item.state === "At risk"
                                ? "bg-danger"
                                : item.state === "Done"
                                  ? "bg-forest"
                                  : "bg-line-strong",
                          )}
                        />
                      </span>
                      <span className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                        <span className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
                          <span className="shrink-0 text-[0.6875rem] text-ink-subtle">
                            {item.day}
                          </span>
                          <span className="truncate text-[0.75rem] text-ink">
                            {item.place}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-[0.625rem] font-medium",
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

              {/* Disruption */}
              <div className="mt-3 rounded-lg border border-amber-line bg-amber-soft/70 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.625rem] font-semibold tracking-[0.06em] text-amber uppercase">
                    Disruption · DIS-DEMO-03
                  </p>
                  <span className="rounded border border-amber-line bg-surface px-1.5 py-px text-[0.5625rem] font-medium text-amber">
                    Executing
                  </span>
                </div>
                <p className="mt-1 text-[0.75rem] font-medium text-ink">
                  Lodge cancelled night 2 — Namche
                </p>
                <p className="mt-0.5 text-[0.6875rem] leading-4 text-ink-muted">
                  Supplier cancellation · Severity high · Day 2
                </p>
              </div>
            </div>

            {/* Right column */}
            <div className="min-w-0 border-t border-line bg-surface-sunken/60 p-3 sm:border-t-0 sm:p-4">
              <p className="text-[0.625rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                Impact summary
              </p>
              <ul className="mt-2 space-y-1.5 text-[0.6875rem] leading-4 text-ink-muted">
                <li className="flex gap-1.5">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-subtle" />
                  Itinerary day 2 accommodation
                </li>
                <li className="flex gap-1.5">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-subtle" />1
                  supplier booking linked to the trip
                </li>
                <li className="flex gap-1.5">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-subtle" />6
                  travelers affected
                </li>
              </ul>

              <p className="mt-3.5 text-[0.625rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                Recovery checklist
              </p>
              <ul className="mt-2 space-y-1.5">
                {tasks.map((task) => (
                  <li key={task.label} className="flex items-start gap-1.5">
                    <span
                      className={cn(
                        "mt-px flex size-3 shrink-0 items-center justify-center rounded-[3px] border",
                        task.done
                          ? "border-forest bg-forest text-white"
                          : "border-line-strong bg-surface",
                      )}
                    >
                      {task.done ? (
                        <CheckIcon className="size-2" strokeWidth={3} />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "text-[0.6875rem] leading-4",
                        task.done ? "text-ink-subtle line-through" : "text-ink",
                      )}
                    >
                      {task.label}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-lg border border-line bg-surface p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.625rem] font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                    Traveler update
                  </p>
                  <span className="rounded border border-sage-line bg-sage px-1.5 py-px text-[0.5625rem] font-medium text-forest">
                    Draft
                  </span>
                </div>
                <p className="mt-1.5 text-[0.6875rem] leading-[1.15rem] text-ink-muted">
                  “Hi all — a small change for night two in Namche. We have confirmed a
                  replacement lodge a few minutes from the original. Tomorrow&rsquo;s
                  start time is unchanged.”
                </p>
                <p className="mt-1.5 text-[0.5625rem] text-ink-subtle">
                  Draft only · review before sending
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <figcaption className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-ink-subtle">
        <span
          aria-hidden="true"
          className="mt-1.5 size-1 shrink-0 rounded-full bg-amber"
        />
        <span>
          Illustrative product preview. The trip, travelers, lodge and costs are fictional
          demo data; this is not a live record of any agency&rsquo;s operation.
        </span>
      </figcaption>
    </figure>
  );
}
