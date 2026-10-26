import { Link } from 'react-router-dom';
import { PERMISSION_CODES, type WorkspaceFinancialSummary } from '@trailcomand/shared';

import { Badge } from '@/components/ui/badge';
import { TripIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { formatCurrency, formatDateRange } from '@/lib/utils';
import { useWorkspaceFinancials } from '@/features/finance/hooks/useFinance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MARGIN_BANDS, formatMargin, formatSignedCurrency } from '@/features/finance/components/margin';

/** A trip under this margin gets a flag; below FINANCE_HEALTHY it stays colour-coded only. */
const LOW_MARGIN_PERCENT = 10;

function LoadingState() {
  return (
    <div role="status" aria-label="Loading finance" className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((key) => <Skeleton key={key} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export function FinanceDashboardPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const canReadFinance = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.FINANCE_READ));
  const summary = useWorkspaceFinancials();

  if (!canReadFinance) {
    return (
      <div className="mx-auto max-w-6xl">
        <Card role="alert"><CardContent className="p-6 text-sm text-fg-muted">
          You do not have permission to view agency finances.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Finance</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Agency-wide revenue, outstanding balances and profit per trip. Figures are live — derived from bookings, suppliers and staff rates.
        </p>
      </header>

      {!workspaceId ? (
        <p className="text-sm text-fg-muted">Select a workspace to view finances.</p>
      ) : summary.isPending ? (
        <LoadingState />
      ) : summary.isError ? (
        <Card role="alert"><CardContent className="p-6 text-sm text-fg-muted">
          Could not load the financial summary.{' '}
          <Button type="button" variant="link" className="h-auto px-0" onClick={() => summary.refetch()}>Try again</Button>
        </CardContent></Card>
      ) : (
        <DashboardContent summary={summary.data} />
      )}
    </div>
  );
}

function DashboardContent({ summary }: { summary: WorkspaceFinancialSummary }) {
  const { currency } = summary;
  const overallBand = MARGIN_BANDS[
    summary.totalRevenue <= 0 ? 'NO_REVENUE'
      : summary.overallMarginPercent >= 20 ? 'HEALTHY'
        : summary.overallMarginPercent >= 5 ? 'WARNING'
          : 'CRITICAL'
  ];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total revenue"
          value={formatCurrency(summary.totalRevenue, currency)}
          subtext={`${formatCurrency(summary.totalPaid, currency)} collected across ${summary.tripCount} ${summary.tripCount === 1 ? 'trip' : 'trips'}`}
        />
        <StatCard
          label="Outstanding balance"
          value={formatCurrency(summary.totalOutstanding, currency)}
          tone={summary.totalOutstanding > 0 ? 'danger' : 'success'}
          subtext={summary.totalOutstanding > 0 ? 'Still owed by customers' : 'Everything collected'}
        />
        <StatCard
          label="Profit"
          tone={overallBand.tone}
          value={formatCurrency(summary.totalActualProfit, currency)}
          subtext={`${formatMargin(summary.overallMarginPercent)} margin · ${formatSignedCurrency(summary.totalActualProfit, currency)} on actual cost`}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Trip profitability</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              Ranked by margin. Estimated vs actual profit: {formatCurrency(summary.totalEstimatedProfit, currency)} / {formatCurrency(summary.totalActualProfit, currency)}.
            </p>
          </div>
          {summary.lowMarginTripCount > 0 ? (
            <Badge variant="danger">
              {summary.lowMarginTripCount} {summary.lowMarginTripCount === 1 ? 'trip' : 'trips'} below {LOW_MARGIN_PERCENT}%
            </Badge>
          ) : null}
        </CardHeader>

        {!summary.trips.length ? (
          <CardContent>
            <EmptyState
              icon={TripIcon}
              title="No trips to report on"
              description="Once a trip has a booking or recorded costs it will appear here."
            />
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.trips.map((row) => {
                  const band = MARGIN_BANDS[row.marginBand];
                  const isLow = row.totalRevenue > 0 && row.marginPercent < LOW_MARGIN_PERCENT;
                  return (
                    <TableRow key={row.tripId}>
                      <TableCell>
                        <Link to={`/trips/${row.tripId}?tab=finance`} className="text-sm font-medium text-fg hover:text-accent">
                          {row.name}
                        </Link>
                        <p className="mt-0.5 text-xs tabular-nums text-fg-subtle">{row.tripNumber}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-fg-muted">
                        {formatDateRange(row.startDate, row.endDate)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-fg">
                        {formatCurrency(row.totalRevenue, currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-fg-muted">
                        {formatCurrency(row.totalCost, currency)}
                      </TableCell>
                      <TableCell className={`text-right text-sm tabular-nums ${row.grossProfit < 0 ? 'text-danger' : 'text-fg'}`}>
                        {formatSignedCurrency(row.grossProfit, currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`text-sm font-medium tabular-nums ${band.text}`}>
                          {row.marginBand === 'NO_REVENUE' ? '—' : formatMargin(row.marginPercent)}
                        </span>
                        {isLow ? <Badge variant="danger" className="ml-2">Low margin</Badge> : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {summary.mostProfitableTrip ? (
          <CardContent className="border-t border-border pt-4">
            <p className="text-sm text-fg-muted">
              Most profitable trip:{' '}
              <Link to={`/trips/${summary.mostProfitableTrip.tripId}?tab=finance`} className="font-medium text-fg hover:text-accent">
                {summary.mostProfitableTrip.name}
              </Link>{' '}
              <span className="tabular-nums text-fg-subtle">
                ({formatMargin(summary.mostProfitableTrip.marginPercent)} margin)
              </span>
            </p>
          </CardContent>
        ) : null}
      </Card>
    </>
  );
}
