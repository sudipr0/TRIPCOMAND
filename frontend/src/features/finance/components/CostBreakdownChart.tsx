import type { CostCategory, CostBreakdownItem } from '@trailcomand/shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { MoneyIcon } from '@/components/icons';

/** Toast-tinted bars, in a fixed order so the same slice keeps the same colour. */
const BAR_COLORS: Record<CostCategory, string> = {
  Suppliers: 'bg-accent',
  Staff: 'bg-[hsl(var(--info))]',
  Recovery: 'bg-[hsl(var(--warning))]',
  Other: 'bg-fg-subtle',
};

/**
 * A proportional bar per cost category. Widths are the category's share of the
 * total, so the row lengths always add up to one full bar.
 */
export function CostBreakdownChart({
  breakdown,
  currency,
  totalCost,
}: {
  breakdown: CostBreakdownItem[];
  currency: string;
  totalCost: number;
}) {
  const items = breakdown.filter((item) => item.amount > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between gap-2">
          <CardTitle>Cost breakdown</CardTitle>
          <span className="text-xs tabular-nums text-fg-subtle">
            {formatCurrency(totalCost, currency)} total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {!items.length ? (
          <EmptyState
            icon={MoneyIcon}
            title="No costs recorded"
            description="Supplier bookings, staff rates and recovery spend will appear here."
          />
        ) : (
          <>
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-bg-muted"
              role="img"
              aria-label={`Cost split: ${items.map((item) => `${item.category} ${item.percent}%`).join(', ')}`}
            >
              {items.map((item) => (
                <div
                  key={item.category}
                  className={BAR_COLORS[item.category]}
                  style={{ width: `${Math.max(item.percent, 1)}%` }}
                  title={`${item.category}: ${formatCurrency(item.amount, currency)} (${item.percent}%)`}
                />
              ))}
            </div>
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.category}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-2 text-fg">
                      <span className={`inline-block h-2 w-2 rounded-full ${BAR_COLORS[item.category]}`} aria-hidden="true" />
                      {item.category}
                    </span>
                    <span className="tabular-nums text-fg-muted">
                      {formatCurrency(item.amount, currency)}
                      <span className="ml-2 text-xs text-fg-subtle">{item.percent}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-bg-muted">
                    <div
                      className={`h-1.5 rounded-full ${BAR_COLORS[item.category]}`}
                      style={{ width: `${Math.max(item.percent, 1)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
