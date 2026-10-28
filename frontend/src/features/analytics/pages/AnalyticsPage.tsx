import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { PERMISSION_CODES } from '@trailcomand/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { TripIcon, WarningIcon } from '@/components/icons';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { formatCurrency, formatDateRange } from '@/lib/utils';
import { useDashboardKpis } from '@/features/analytics/hooks/useAnalytics';
import { useAnalyticsExport } from '@/features/analytics/hooks/useAnalytics';
import { useTripProfitability } from '@/features/analytics/hooks/useAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupplierReliability } from '@/features/analytics/hooks/useAnalytics';
import { useOperationalAnalytics } from '@/features/analytics/hooks/useAnalytics';
import { RevenueCostChart } from '@/features/analytics/components/RevenueCostChart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const formatPercent = (value: number | null) =>
  value === null ? '—' : `${value.toFixed(1)}%`;

const currentYear = () => new Date().getUTCFullYear();

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card role="alert">
      <CardContent className="p-6 text-sm text-fg-muted">
        {message}{' '}
        <Button type="button" variant="link" className="h-auto px-0" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const canRead = useWorkspaceStore((state) =>
    state.permissions.includes(PERMISSION_CODES.ANALYTICS_READ),
  );
  const [year, setYear] = useState(currentYear);
  const [minBookings, setMinBookings] = useState(3);
  const [includeIncomplete, setIncludeIncomplete] = useState(true);

  const kpis = useDashboardKpis(year);
  const profitability = useTripProfitability({ year, limit: 200 });
  const suppliers = useSupplierReliability(year, minBookings);
  const operations = useOperationalAnalytics(year);
  const exportReport = useAnalyticsExport();

  const years = useMemo(() => {
    const base = currentYear();
    return [base, base - 1, base - 2, base - 3];
  }, []);

  if (!canRead) {
    return (
      <div className="mx-auto max-w-6xl">
        <Card role="alert">
          <CardContent className="p-6 text-sm text-fg-muted">
            You do not have permission to view analytics.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workspaceId) {
    return <p className="text-sm text-fg-muted">Select a workspace to view analytics.</p>;
  }

  const exportButton = (
    report: 'trip-profitability' | 'supplier-reliability' | 'dashboard-kpis' | 'operational',
    label: string,
  ) => (
    <Button
      size="sm"
      type="button"
      variant="secondary"
      disabled={exportReport.isPending}
      onClick={() =>
        exportReport.mutate({
          report,
          year,
          ...(report === 'supplier-reliability' ? { minBookings } : {}),
          ...(report === 'trip-profitability' ? { includeIncomplete } : {}),
        })
      }
    >
      {exportReport.isPending ? 'Exporting…' : label}
    </Button>
  );

  const kpi = kpis.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Analytics</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Revenue, margin, trip profitability, supplier reliability and disruption impact.
            Every figure is derived from recorded bookings, costs and disruptions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="analytics-year" className="text-sm text-fg-muted">
            Year
          </label>
          <select
            value={year}
            id="analytics-year"
            onChange={(event) => setYear(Number(event.target.value))}
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm text-fg"
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* A. KPI cards */}
      {kpis.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading KPIs">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-24 w-full" />
          ))}
        </div>
      ) : kpis.isError ? (
        <ErrorCard message="Could not load dashboard KPIs." onRetry={() => kpis.refetch()} />
      ) : kpi ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={`Revenue ${year}`}
              value={
                kpi.revenueYtd.availability === 'UNAVAILABLE'
                  ? 'Unavailable'
                  : formatCurrency(kpi.revenueYtd.value ?? 0, kpi.currency)
              }
              subtext={
                kpi.revenueYtd.refunds > 0
                  ? `${formatCurrency(kpi.revenueYtd.refunds, kpi.currency)} refunds netted off`
                  : `Bookings confirmed in ${year}`
              }
            />
            <StatCard
              label="Profit margin"
              tone={
                kpi.profitMargin.value === null
                  ? 'default'
                  : kpi.profitMargin.value < 0
                    ? 'danger'
                    : 'success'
              }
              value={
                kpi.profitMargin.availability === 'UNAVAILABLE'
                  ? 'Unavailable'
                  : formatPercent(kpi.profitMargin.value)
              }
              subtext={
                kpi.profitMargin.availability === 'UNAVAILABLE'
                  ? 'No revenue to divide by'
                  : `${formatCurrency(kpi.profitMargin.revenue, kpi.currency)} revenue · ${formatCurrency(kpi.profitMargin.actualCosts, kpi.currency)} actual cost`
              }
            />
            <StatCard
              label="Total trips"
              value={String(kpi.totalTrips.value)}
              subtext={`Not cancelled, starting in ${year}`}
            />
            <StatCard
              label="Active disruptions"
              subtext="Open right now, any year"
              value={String(kpi.activeDisruptions.value)}
              tone={kpi.activeDisruptions.value > 0 ? 'danger' : 'default'}
            />
          </div>

          {kpi.dataQuality.tripsWithRevenueButNoCost > 0 ? (
            <Card>
              <CardContent className="flex items-start gap-2 p-4 text-sm text-fg-muted">
                <WarningIcon size={18} weight="regular" className="mt-0.5 shrink-0" />
                <span>{kpi.dataQuality.note}</span>
              </CardContent>
            </Card>
          ) : null}

          {kpi.excludedCurrencies.length > 0 ? (
            <p className="text-xs text-fg-subtle" role="note">
              Totals are in {kpi.currency}. Money held in{' '}
              {kpi.excludedCurrencies.join(', ')} is excluded rather than converted,
              because no exchange-rate source is configured.
            </p>
          ) : null}
        </>
      ) : null}

      {/* B. Revenue vs actual costs */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Revenue vs actual costs</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              {kpi ? `${kpi.currency} · ${year}` : year}
            </p>
          </div>
          {exportButton('dashboard-kpis', 'Export KPIs')}
        </CardHeader>
        {kpis.isPending ? (
          <CardContent><Skeleton className="h-32 w-full" /></CardContent>
        ) : kpi ? (
          <RevenueCostChart
            currency={kpi.currency}
            revenue={kpi.profitMargin.availability === 'UNAVAILABLE' ? null : kpi.profitMargin.revenue}
            actualCost={kpi.profitMargin.availability === 'UNAVAILABLE' ? null : kpi.profitMargin.actualCosts}
            unavailableReason={
              kpi.profitMargin.availability === 'UNAVAILABLE'
                ? 'No recognised revenue in this period, so a revenue-versus-cost comparison would be meaningless.'
                : null
            }
          />
        ) : null}
      </Card>

      {/* C. Trip profitability */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Trip profitability</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              Revenue and recorded actual cost per trip. Trips with incomplete data are labelled.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-fg-muted">
              <input
                type="checkbox"
                checked={includeIncomplete}
                onChange={(event) => setIncludeIncomplete(event.target.checked)}
              />
              Include incomplete
            </label>
            {exportButton('trip-profitability', 'Export CSV')}
          </div>
        </CardHeader>

        {profitability.isPending ? (
          <CardContent><Skeleton className="h-56 w-full" /></CardContent>
        ) : profitability.isError ? (
          <CardContent className="p-6 text-sm text-fg-muted">
            Could not load trip profitability.
          </CardContent>
        ) : !profitability.data || profitability.data.rows.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={TripIcon}
              title="No trips to report on"
              description={`No trips started in ${year}. Choose another year, or create a trip with a booking.`}
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
                  <TableHead className="text-right">Actual cost</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profitability.data.rows
                  .filter((row) => includeIncomplete || row.complete)
                  .map((row) => (
                    <TableRow key={row.tripId}>
                      <TableCell>
                        <Link
                          to={`/trips/${row.tripId}?tab=finance`}
                          className="text-sm font-medium text-fg hover:text-accent"
                        >
                          {row.name}
                        </Link>
                        <p className="mt-0.5 text-xs tabular-nums text-fg-subtle">{row.tripNumber}</p>
                        {row.completenessNote ? (
                          <p className="mt-1 text-xs text-fg-subtle">{row.completenessNote}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-fg-muted">
                        {formatDateRange(row.startDate, row.endDate)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-fg">
                        {formatCurrency(row.revenue, row.currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-fg-muted">
                        {formatCurrency(row.actualCost, row.currency)}
                      </TableCell>
                      <TableCell
                        className={`text-right text-sm tabular-nums ${row.profit < 0 ? 'text-danger' : 'text-fg'}`}
                      >
                        {formatCurrency(row.profit, row.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-medium tabular-nums text-fg">
                          {formatPercent(row.marginPercent)}
                        </span>
                        {!row.complete ? (
                          <Badge variant="warning" className="ml-2">
                            Incomplete
                          </Badge>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        )}

        {profitability.data ? (
          <CardContent className="border-t border-border pt-4">
            <p className="text-sm text-fg-muted">
              {profitability.data.totals.trips} trips ·{' '}
              <span className="tabular-nums text-fg">
                {formatCurrency(profitability.data.totals.revenue, profitability.data.currency)}
              </span>{' '}
              revenue ·{' '}
              <span className="tabular-nums text-fg">
                {formatCurrency(profitability.data.totals.actualCost, profitability.data.currency)}
              </span>{' '}
              actual cost ·{' '}
              <span className="tabular-nums text-fg">
                {formatPercent(profitability.data.totals.marginPercent)}
              </span>{' '}
              margin
              {profitability.data.totals.incompleteTrips > 0
                ? ` · ${profitability.data.totals.incompleteTrips} with incomplete data`
                : ''}
            </p>
          </CardContent>
        ) : null}
      </Card>

      {/* D. Supplier scorecard */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Supplier reliability</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              Based only on supplier bookings in {year} and disruptions explicitly
              attributed to that supplier.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="min-bookings" className="text-xs text-fg-muted">
              Min. bookings
            </label>
            <select
              id="min-bookings"
              value={minBookings}
              onChange={(event) => setMinBookings(Number(event.target.value))}
              className="h-8 rounded-md border border-border bg-bg px-2 text-sm text-fg"
            >
              {[1, 3, 5, 10].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {exportButton('supplier-reliability', 'Export CSV')}
          </div>
        </CardHeader>

        {suppliers.isPending ? (
          <CardContent><Skeleton className="h-48 w-full" /></CardContent>
        ) : suppliers.isError ? (
          <CardContent className="p-6 text-sm text-fg-muted">
            Could not load supplier reliability.
          </CardContent>
        ) : !suppliers.data || suppliers.data.suppliers.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={TripIcon}
              title="No suppliers yet"
              description="Reliability is scored from supplier bookings, so add suppliers and book them on trips first."
            />
          </CardContent>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Bookings</TableHead>
                    <TableHead className="text-right">Attributed disruptions</TableHead>
                    <TableHead className="text-right">Reliability</TableHead>
                    <TableHead>Basis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.data.suppliers.map((row) => (
                    <TableRow key={row.supplierId}>
                      <TableCell>
                        <Link
                          to={`/suppliers/${row.supplierId}`}
                          className="text-sm font-medium text-fg hover:text-accent"
                        >
                          {row.supplierName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-fg-muted">{row.category}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-fg">
                        {row.bookingsInWindow}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-fg-muted">
                        {row.attributedDisruptions}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-fg">
                        {formatPercent(row.reliabilityPercent)}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-fg-subtle">{row.explanation}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <CardContent className="border-t border-border pt-4">
              <p className="text-xs text-fg-subtle">
                {suppliers.data.methodology.formula}. {suppliers.data.methodology.attribution}{' '}
                A supplier needs at least {suppliers.data.methodology.minimumBookings} bookings
                before a score is shown.
              </p>
            </CardContent>
          </>
        )}
      </Card>

      {/* E. Operational analytics */}
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Operational impact</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">
              Disruptions reported in {year}, and the recovery work recorded against them.
            </p>
          </div>
          {exportButton('operational', 'Export CSV')}
        </CardHeader>

        {operations.isPending ? (
          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
        ) : operations.isError ? (
          <CardContent className="p-6 text-sm text-fg-muted">
            Could not load operational analytics.
          </CardContent>
        ) : operations.data ? (
          <>
            <div className="grid gap-3 px-6 pb-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Disruptions reported"
                value={String(operations.data.disruptions.totalInWindow)}
                subtext={`${operations.data.disruptions.active} still open`}
              />
              <StatCard
                label="Trips affected"
                value={String(operations.data.affectedTrips.count)}
                subtext={`${operations.data.affectedTrips.currentlyAffected} open disruptions today`}
              />
              <StatCard
                label="Recorded recovery cost"
                subtext={`${operations.data.recovery.plansWithCost} plans with a cost`}
                value={formatCurrency(operations.data.recovery.recordedCost, operations.data.recovery.currency)}
              />
              <StatCard
                label="Avg. resolution time"
                subtext={`${operations.data.recovery.resolvedCount} resolved disruptions`}
                value={
                  operations.data.recovery.averageResolutionHours === null
                    ? 'Unavailable'
                    : `${operations.data.recovery.averageResolutionHours.toFixed(1)} h`
                }
              />
            </div>

            {operations.data.disruptions.byCategory.length > 0 ? (
              <div className="overflow-x-auto border-t border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Disruptions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.data.disruptions.byCategory.map((item) => (
                      <TableRow key={item.category}>
                        <TableCell className="text-sm text-fg">{item.category}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-fg">
                          {item.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </>
        ) : null}
      </Card>
    </div>
  );
}
