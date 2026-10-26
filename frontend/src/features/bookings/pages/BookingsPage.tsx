import { BOOKING_STATUSES, PERMISSION_CODES, type BookingStatus } from '@trailcomand/shared';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { BookingIcon, MoreIcon, SearchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookingStatusBadge, bookingStatusLabels } from '@/features/bookings/components/BookingBadges';
import { useBookings } from '@/features/bookings/hooks/useBookings';
import { useAllInquiryCustomers } from '@/features/inquiries/hooks/useInquiries';
import { formatCurrency, formatDateRange } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';

const PAGE_SIZE = 20;

const completable = new Set(['IN_PROGRESS', 'CONFIRMED', 'PENDING']);
const cancellable = new Set(['PENDING', 'CONFIRMED', 'IN_PROGRESS']);
const payable = new Set(['PENDING', 'CONFIRMED', 'IN_PROGRESS']);

function TableSkeleton() {
  return (
    <TableBody>
      {Array.from({ length: 5 }, (_, row) => (
        <TableRow key={row}>
          {Array.from({ length: 9 }, (_, column) => <TableCell key={column}><Skeleton className="h-5 w-20" /></TableCell>)}
        </TableRow>
      ))}
    </TableBody>
  );
}

function Balance({ amount, currency }: { amount: string; currency: string }) {
  const value = Number(amount);
  const tone = value <= 0 ? 'text-success' : 'text-danger';
  return <span className={`whitespace-nowrap text-sm font-medium tabular-nums ${tone}`}>{formatCurrency(amount, currency)}</span>;
}

export function BookingsPage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.BOOKING_UPDATE));
  const canCancel = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.BOOKING_CANCEL));
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [customerId, setCustomerId] = useState('');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next !== search) { setSearch(next); setOffset(0); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => { setOffset(0); }, [workspaceId]);

  const list = useBookings({
    limit: PAGE_SIZE, offset,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
  });
  const customers = useAllInquiryCustomers();
  const customerNames = new Map(customers.data?.map((customer) => [customer.id, customer.fullName]));
  const filtered = Boolean(search || status || customerId);

  useEffect(() => {
    if (list.data && offset > 0 && offset >= list.data.total) {
      setOffset(Math.max(0, Math.ceil(list.data.total / PAGE_SIZE) - 1) * PAGE_SIZE);
    }
  }, [list.data, offset]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Bookings</h1>
        <p className="mt-2 text-sm text-fg-muted">Confirmed trips and payment tracking</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <SearchIcon size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <Input aria-label="Search bookings" placeholder="Search number, customer or trek" maxLength={120} className="pl-9"
            value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
        </div>
        <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as BookingStatus | ''); setOffset(0); }}>
          <option value="">All statuses</option>
          {BOOKING_STATUSES.map((item) => <option key={item} value={item}>{bookingStatusLabels[item] ?? item}</option>)}
        </Select>
        <Select aria-label="Filter by customer" value={customerId} disabled={customers.isPending || customers.isError}
          onChange={(event) => { setCustomerId(event.target.value); setOffset(0); }}>
          <option value="">All customers</option>
          {customers.data?.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName}</option>)}
        </Select>
        {list.data ? <span className="ml-auto whitespace-nowrap text-sm text-fg-muted">
          {list.data.total} {list.data.total === 1 ? 'booking' : 'bookings'}
        </span> : null}
      </div>

      {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view bookings.</p>
        : list.isError ? <Card role="alert" className="p-6 text-sm text-fg-muted">
          Could not load bookings. <Button type="button" variant="link" onClick={() => list.refetch()}>Try again</Button>
        </Card>
          : <>
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead>Trek</TableHead>
                    <TableHead>Dates</TableHead><TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                {list.isPending ? <TableSkeleton /> : list.data?.items.length ? (
                  <TableBody>
                    {list.data.items.map((booking) => {
                      const canPay = payable.has(booking.status);
                      const canComplete = completable.has(booking.status) && canUpdate;
                      const canCancelNow = cancellable.has(booking.status) && canCancel;
                      return (
                        <TableRow key={booking.id} tabIndex={0} aria-label={`View ${booking.bookingNumber}`}
                          className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                          onClick={(event) => {
                            if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
                            if (event.target instanceof Element && event.target.closest('a, button, [role="menuitem"]')) return;
                            navigate(`/bookings/${booking.id}`);
                          }}
                          onKeyDown={(event) => {
                            if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                              event.preventDefault();
                              navigate(`/bookings/${booking.id}`);
                            }
                          }}>
                          <TableCell className="whitespace-nowrap"><Link to={`/bookings/${booking.id}`}
                            className="text-xs font-medium tabular-nums text-fg-subtle hover:underline">{booking.bookingNumber}</Link></TableCell>
                          <TableCell className="text-sm font-medium text-fg">{customerNames.get(booking.customerId) ?? '—'}</TableCell>
                          <TableCell className="max-w-48 truncate text-sm text-fg-muted" title={booking.trekName}>{booking.trekName}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-fg-muted">{formatDateRange(booking.startDate, booking.endDate)}</TableCell>
                          <TableCell className="whitespace-nowrap text-right text-sm tabular-nums text-fg">{formatCurrency(booking.totalAmount, booking.currency)}</TableCell>
                          <TableCell className={`whitespace-nowrap text-right text-sm tabular-nums ${Number(booking.paidAmount) > 0 ? 'text-success' : 'text-fg-muted'}`}>
                            {formatCurrency(booking.paidAmount, booking.currency)}
                          </TableCell>
                          <TableCell className="text-right"><Balance amount={booking.balanceAmount} currency={booking.currency} /></TableCell>
                          <TableCell><BookingStatusBadge status={booking.status} /></TableCell>
                          <TableCell>
                            <div className="flex justify-end" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${booking.bookingNumber}`}><MoreIcon size={18} /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild><Link to={`/bookings/${booking.id}`}>View</Link></DropdownMenuItem>
                                  {canPay ? <DropdownMenuItem asChild><Link to={`/bookings/${booking.id}?action=pay`}>Record payment</Link></DropdownMenuItem> : null}
                                  {canComplete ? <DropdownMenuItem asChild><Link to={`/bookings/${booking.id}?action=complete`}>Complete booking</Link></DropdownMenuItem> : null}
                                  {canCancelNow ? <DropdownMenuItem asChild><Link to={`/bookings/${booking.id}?action=cancel`}>Cancel booking</Link></DropdownMenuItem> : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                ) : (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={9}>
                        <EmptyState icon={BookingIcon} title={filtered ? 'No matching bookings' : 'No bookings yet'}
                          description={filtered ? 'Try another search or filter.' : 'Bookings are created when a quotation is accepted and converted.'} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </Card>
            {list.data && list.data.total > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
              <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, list.data.total)} of {list.data.total}</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button>
                <Button type="button" size="sm" variant="secondary" disabled={offset + PAGE_SIZE >= list.data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</Button>
              </div>
            </div> : null}
          </>}
    </div>
  );
}
