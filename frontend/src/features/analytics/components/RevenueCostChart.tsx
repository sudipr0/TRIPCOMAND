import { formatCurrency } from "@/lib/utils";

/**
 * Revenue against actual costs, as one horizontal bar per measure.
 *
 * Deliberately not a charting library: the project does not ship one, and a
 * two-bar comparison does not justify adding a dependency. Both bars share a
 * single scale, so their lengths are directly comparable - which is the whole
 * point of the chart. An unavailable figure renders as a labelled gap rather
 * than a zero-length bar, because "no data" and "zero" must not look alike.
 */

interface Measure {
  label: string;
  value: number | null;
  tone: "revenue" | "cost";
}

export function RevenueCostChart({
  revenue,
  actualCost,
  currency,
  unavailableReason,
}: {
  revenue: number | null;
  actualCost: number | null;
  currency: string;
  unavailableReason?: string | null;
}) {
  const measures: Measure[] = [
    { label: "Revenue", value: revenue, tone: "revenue" },
    { label: "Actual costs", value: actualCost, tone: "cost" },
  ];
  const peak = Math.max(...measures.map((m) => Math.max(0, m.value ?? 0)), 0);

  if (unavailableReason) {
    return (
      <p className="p-6 text-sm text-fg-muted" role="note">
        {unavailableReason}
      </p>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {measures.map((measure) => {
        const width =
          measure.value === null || peak <= 0
            ? 0
            : Math.max(2, (Math.max(0, measure.value) / peak) * 100);
        return (
          <div key={measure.label}>
            <div className="mb-1 flex items-baseline justify-between gap-4">
              <span className="text-sm text-fg-muted">{measure.label}</span>
              <span className="text-sm font-medium tabular-nums text-fg">
                {measure.value === null
                  ? "Unavailable"
                  : formatCurrency(measure.value, currency)}
              </span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-bg-muted"
              role="img"
              aria-label={`${measure.label}: ${
                measure.value === null
                  ? "unavailable"
                  : formatCurrency(measure.value, currency)
              }`}
            >
              <div
                className={
                  measure.tone === "revenue"
                    ? "h-full rounded-full bg-accent"
                    : "h-full rounded-full bg-fg-subtle"
                }
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-fg-subtle">
        Revenue is contracted booking value recognised in the period. Actual costs
        are recorded supplier, staff and approved recovery costs — not estimates.
      </p>
    </div>
  );
}
