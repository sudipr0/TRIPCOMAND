import { Link } from 'react-router-dom';
import type { TripDetail } from '@trailcomand/shared';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRightIcon, SpinnerIcon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useTripFinancials } from '@/features/finance/hooks/useFinance';
import { CostBreakdownChart } from '@/features/finance/components/CostBreakdownChart';
import { ProfitabilityWarning } from '@/features/finance/components/ProfitabilityWarning';
import { FinancialSummaryCards } from '@/features/finance/components/FinancialSummaryCards';

/**
 * Trip profitability. Revenue is the linked booking's total; costs are supplier
 * bookings plus staff rates plus approved recovery spend. All derived on read.
 */
export function FinanceTab({ trip }: { trip: TripDetail }) {
  const financials = useTripFinancials(trip.id);

  if (financials.isPending) {
    return (
      <div role="status" aria-label="Loading financials" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (financials.isError) {
    return (
      <Card role="alert">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-fg-muted">Could not load financials for this trip.</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => financials.refetch()}>
            <SpinnerIcon size={16} className={financials.isFetching ? 'animate-spin' : undefined} />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const data = financials.data;
  const hasRevenue = data.totalRevenue > 0;

  return (
    <div className="space-y-4">
      <ProfitabilityWarning financials={data} />

      <FinancialSummaryCards financials={data} />

      {!hasRevenue ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-fg-muted">
              This trip has no linked booking, so there is no revenue to measure profit against.
              Costs are still tracked below.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <CostBreakdownChart
          breakdown={data.breakdown}
          currency={data.currency}
          totalCost={data.totalActualCost}
        />

        <Card>
          <CardHeader><CardTitle>Estimate vs actual</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-fg-muted">Estimated cost</span>
              <span className="tabular-nums text-fg">{formatCurrency(data.totalEstimatedCost, data.currency)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-fg-muted">Actual cost</span>
              <span className="tabular-nums text-fg">{formatCurrency(data.totalActualCost, data.currency)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2 border-t border-border pt-3">
              <span className="text-fg-muted">Variance</span>
              <span className={`tabular-nums ${data.costVariance.exceedsEstimate ? 'text-danger' : 'text-success'}`}>
                {data.costVariance.amount > 0 ? '+' : ''}
                {formatCurrency(data.costVariance.amount, data.currency)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-fg-muted">Collected</span>
              <span className="tabular-nums text-fg">{formatCurrency(data.paidAmount, data.currency)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-fg-muted">Outstanding</span>
              <span className="tabular-nums text-fg">{formatCurrency(data.outstandingAmount, data.currency)}</span>
            </div>
            {data.bookingId ? (
              <Button variant="link" asChild className="h-auto px-0 text-sm">
                <Link to={`/bookings/${data.bookingId}`} className="inline-flex items-center gap-1">
                  View booking <ArrowRightIcon size={14} />
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
