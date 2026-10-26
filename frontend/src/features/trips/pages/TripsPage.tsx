import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ListTripsQuery, TripDetail, TripStatus } from '@trailcomand/shared';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatDateRange, fromDateInput } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { useTrips } from '@/features/trips/hooks/useTrips';
import { SpinnerIcon, TripIcon, UsersIcon } from '@/components/icons';
import { useAllInquiryCustomers } from '@/features/inquiries/hooks/useInquiries';
import { TripStatusBadge, tripStatusLabel } from '@/features/trips/components/TripStatusBadge';
import { ReadinessBadge, type ReadinessStatus } from '@/features/trips/components/ReadinessBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PAGE_SIZE = 20;

/**
 * The list payload carries the same relations the readiness endpoint reads, so the badge is
 * derived with the backend's rules rather than issuing one request per row.
 */
function rowReadiness(trip: TripDetail): { status: ReadinessStatus | 'NOT_APPLICABLE'; tip?: string } {
  if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') return { status: 'NOT_APPLICABLE' };
  const travelers = trip.travelers?.length ?? 0;
  const issues: string[] = [];
  const warnings: string[] = [];
  if (travelers === 0) issues.push('No travelers added');
  if (!trip.operationsManagerId) issues.push('No operations manager assigned');
  if (!trip.leadGuideId) warnings.push('Lead guide not yet assigned');
  if (!trip.publishedItineraryVersionId) warnings.push('Itinerary not yet published');
  const status: ReadinessStatus = issues.length ? 'BLOCKED' : warnings.length ? 'PARTIAL' : 'READY';
  const tip = [...issues, ...warnings].join(' · ') || undefined;
  return { status, tip };
}
const TRIP_STATUS_FILTERS: { value: '' | TripStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'READY', label: 'Ready' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function TripsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | TripStatus>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);

  const filters: ListTripsQuery = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status ? { status } : {}),
    ...(fromDate ? { fromDate: fromDateInput(fromDate) } : {}),
    ...(toDate ? { toDate: fromDateInput(toDate) } : {}),
  };

  const trips = useTrips(filters);
  const customers = useAllInquiryCustomers();
  const customerName = (customerId: string) =>
    customers.data?.find((customer) => customer.id === customerId)?.fullName ?? 'Customer unavailable';

  const total = trips.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(search.trim() || status || fromDate || toDate);

  function resetPage() {
    setPage(0);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Trips</h1>
          <p className="mt-1 text-sm text-fg-muted">Operational trips in progress and planned</p>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="trip-search" className="mb-1 block text-xs font-medium text-fg-muted">Search</label>
          <Input id="trip-search" placeholder="Trip number, name or customer" value={search}
            onChange={(event) => { setSearch(event.target.value); resetPage(); }} />
        </div>
        <div className="w-44">
          <label htmlFor="trip-status" className="mb-1 block text-xs font-medium text-fg-muted">Status</label>
          <Select id="trip-status" value={status} onChange={(event) => { setStatus(event.target.value as '' | TripStatus); resetPage(); }}>
            {TRIP_STATUS_FILTERS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
          </Select>
        </div>
        <div className="w-40">
          <label htmlFor="trip-from" className="mb-1 block text-xs font-medium text-fg-muted">From</label>
          <Input id="trip-from" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); resetPage(); }} />
        </div>
        <div className="w-40">
          <label htmlFor="trip-to" className="mb-1 block text-xs font-medium text-fg-muted">To</label>
          <Input id="trip-to" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); resetPage(); }} />
        </div>
        <span className="ml-auto pb-2 text-xs text-fg-subtle">{total} {total === 1 ? 'trip' : 'trips'}</span>
      </div>

      {trips.isPending ? (
        <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-fg-muted">
          <SpinnerIcon size={22} className="animate-spin" /><span>Loading trips...</span>
        </div>
      ) : trips.isError ? (
        <Card role="alert" className="p-6 text-sm text-fg-muted">
          Could not load trips. <Button type="button" variant="link" onClick={() => trips.refetch()}>Try again</Button>
        </Card>
      ) : !trips.data.items.length ? (
        <EmptyState
          icon={TripIcon}
          title={filtered ? 'No trips match these filters' : 'No trips yet'}
          action={<Button asChild><Link to="/bookings">View bookings</Link></Button>}
          description={filtered
            ? 'Try a different search or clear the filters.'
            : 'Trips are created automatically when a booking is confirmed.'}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Travelers</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.data.items.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-fg-subtle">{trip.tripNumber}</TableCell>
                  <TableCell>
                    <Link to={`/trips/${trip.id}`} className="block min-w-0">
                      <span className="block truncate text-sm font-medium text-fg hover:text-accent">{trip.name}</span>
                      <span className="block truncate text-xs text-fg-muted">{customerName(trip.customerId)}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-fg-muted" title={trip.status === 'IN_PROGRESS' || trip.status === 'READY' ? undefined : tripStatusLabel(trip.status as TripStatus)}>{formatDateRange(trip.startDate, trip.endDate)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <span className="inline-flex items-center gap-1 text-sm tabular-nums text-fg">
                      <UsersIcon size={14} className="text-fg-subtle" aria-hidden="true" />
                      {trip.travelers?.length ?? 0}
                    </span>
                  </TableCell>
                  <TableCell><ReadinessBadge status={rowReadiness(trip).status} title={rowReadiness(trip).tip} /></TableCell>
                  <TableCell><TripStatusBadge status={trip.status as TripStatus} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {trips.data && total > PAGE_SIZE ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-fg-subtle">
            Showing {page * PAGE_SIZE + 1}&ndash;{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
          </span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</Button>
            <Button type="button" size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
