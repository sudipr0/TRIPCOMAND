import type { TripFinancialsResponse } from '@trailcomand/shared';

import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/utils';
import { MARGIN_BANDS, formatMargin } from '@/features/finance/components/margin';

/**
 * The four headline numbers. Margin carries the colour language because it is
 * the one figure that needs an opinion; the others are facts.
 */
export function FinancialSummaryCards({ financials }: { financials: TripFinancialsResponse }) {
  const { currency } = financials;
  const band = MARGIN_BANDS[financials.marginBand];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total revenue"
        value={formatCurrency(financials.totalRevenue, currency)}
        subtext={
          financials.bookingId
            ? `${formatCurrency(financials.paidAmount, currency)} collected · ${formatCurrency(financials.outstandingAmount, currency)} due`
            : 'No booking linked to this trip'
        }
      />
      <StatCard
        label="Total cost"
        value={formatCurrency(financials.totalActualCost, currency)}
        subtext={`Estimated ${formatCurrency(financials.totalEstimatedCost, currency)}`}
      />
      <StatCard
        label="Gross profit"
        value={formatCurrency(financials.grossProfit, currency)}
        subtext={financials.grossProfit >= 0 ? 'Revenue less actual cost' : 'Running at a loss'}
        tone={financials.grossProfit < 0 ? 'danger' : 'default'}
      />
      <StatCard
        label="Margin"
        value={formatMargin(financials.marginPercent)}
        subtext={financials.marginBand === 'NO_REVENUE' ? 'Margin needs revenue' : `${band.label} margin`}
        tone={band.tone}
      />
    </div>
  );
}
