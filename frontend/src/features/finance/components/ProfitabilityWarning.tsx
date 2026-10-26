import type { TripFinancialsResponse } from '@trailcomand/shared';

import { Badge } from '@/components/ui/badge';
import { WarningIcon } from '@/components/icons';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

/**
 * Only renders when actual cost has overtaken the estimate. A trip within budget
 * says nothing here — silence is the good outcome, so it gets no chrome at all.
 */
export function ProfitabilityWarning({ financials }: { financials: TripFinancialsResponse }) {
  const { costVariance, currency } = financials;
  if (!costVariance.exceedsEstimate) return null;

  const hasEstimate = financials.totalEstimatedCost > 0;

  return (
    <Card role="alert" className="border-warning bg-[hsl(var(--warning)/0.06)]">
      <CardContent className="flex flex-wrap items-start gap-3 p-4">
        <WarningIcon size={20} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">
            {hasEstimate
              ? `Costs have exceeded estimates by ${costVariance.percent}%`
              : 'Costs have no estimate to compare against'}
          </p>
          <p className="mt-0.5 text-sm text-fg-muted">
            {hasEstimate
              ? `Actual ${formatCurrency(financials.totalActualCost, currency)} vs estimated ${formatCurrency(financials.totalEstimatedCost, currency)} — ${formatCurrency(costVariance.amount, currency)} over budget.`
              : `${formatCurrency(financials.totalActualCost, currency)} in actual costs was recorded without a budgeted figure.`}
          </p>
        </div>
        {hasEstimate ? <Badge variant="warning">+{formatCurrency(costVariance.amount, currency)}</Badge> : null}
      </CardContent>
    </Card>
  );
}
