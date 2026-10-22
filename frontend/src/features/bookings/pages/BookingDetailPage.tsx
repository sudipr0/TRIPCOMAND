import { PERMISSION_CODES, type BookingDetail, type PaymentDetail } from '@tripchange/shared';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import {
  ArrowRightIcon, CheckIcon, EditIcon, ExternalLinkIcon, PaymentIcon, QuotationIcon, SuccessIcon, TripIcon, WarningIcon,
} from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookingStatusBadge, PaymentTypeBadge } from '@/features/bookings/components/BookingBadges';
import { CancelBookingDialog } from '@/features/bookings/components/CancelBookingDialog';
import { RecordPaymentDialog } from '@/features/bookings/components/RecordPaymentDialog';
import { useBooking, useCompleteBooking, useUpdateBooking } from '@/features/bookings/hooks/useBookings';
import { FormField } from '@/features/auth/components/FormField';
import { useAllInquiryCustomers } from '@/features/inquiries/hooks/useInquiries';
import {
  formatCurrency, formatDate, formatDateRange, formatDateTime, getInitials, toDateInput,
} from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';

const cancellable = new Set(['PENDING', 'CONFIRMED', 'IN_PROGRESS']);
const payable = new Set(['PENDING', 'CONFIRMED', 'IN_PROGRESS']);

function PaymentAmount({ payment, currency }: { payment: PaymentDetail; currency: string }) {
  const isRefund = payment.paymentType === 'REFUND';
  return (
    <span className={`whitespace-nowrap text-sm font-medium tabular-nums ${isRefund ? 'text-danger' : 'text-fg'}`}>
      {isRefund ? '-' : ''}{formatCurrency(payment.amount, payment.currency || currency)}
    </span>
  );
}

function CustomerName({ customerId, fallback }: { customerId: string; fallback?: string }) {
  const customers = useAllInquiryCustomers();
  const name = customers.data?.find((customer) => customer.id === customerId)?.fullName;
  return <>{fallback ?? name ?? (customers.isPending ? 'Loading customer...' : 'Customer unavailable')}</>;
}

function CustomerCard({ booking }: { booking: BookingDetail }) {
  const customers = useAllInquiryCustomers();
  const customer = customers.data?.find((item) => item.id === booking.customerId);
  const name = customer?.fullName ?? 'Customer unavailable';
  return (
    <Card>
      <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(name)}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">{name}</p>
            <p className="truncate text-sm text-fg-muted">{customer?.email ?? 'No email'}</p>
            <p className="text-sm text-fg-muted">{customer?.phone ?? 'No phone'}</p>
          </div>
        </div>
        <Button variant="link" asChild className="mt-3 h-auto px-0 text-sm">
          <Link to={`/customers/${booking.customerId}`} className="inline-flex items-center gap-1">
            View customer <ArrowRightIcon size={14} />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function LinkedRecords({ booking, tripId }: { booking: BookingDetail; tripId?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>Linked records</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {booking.quotationId ? (
          <Link to={`/quotations/${booking.quotationId}`}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm text-fg transition-colors duration-fast hover:bg-bg-muted">
            <span className="inline-flex items-center gap-2"><QuotationIcon size={16} />Quotation</span>
            <ArrowRightIcon size={14} />
          </Link>
        ) : <p className="text-sm text-fg-muted">No quotation linked.</p>}
        {tripId ? (
          <Link to={`/trips/${tripId}`}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm text-fg transition-colors duration-fast hover:bg-bg-muted">
            <span className="inline-flex items-center gap-2"><TripIcon size={16} />Trip</span>
            <ArrowRightIcon size={14} />
          </Link>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm text-fg-muted">
            <span className="inline-flex items-center gap-2"><TripIcon size={16} />Trip</span>
            <span className="text-xs">Created from the quotation on convert</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BookingDetailsForm({ booking, canUpdate }: { booking: BookingDetail; canUpdate: boolean }) {
  const [trekName, setTrekName] = useState(booking.trekName);
  const [startDate, setStartDate] = useState(toDateInput(booking.startDate));
  const [endDate, setEndDate] = useState(toDateInput(booking.endDate));
  const [groupSize, setGroupSize] = useState(String(booking.groupSize));
  const [error, setError] = useState('');
  const update = useUpdateBooking(booking.id);
  const locked = !canUpdate || booking.status === 'CANCELLED' || booking.status === 'COMPLETED' || booking.status === 'REFUNDED';

  useEffect(() => {
    setTrekName(booking.trekName);
    setStartDate(toDateInput(booking.startDate));
    setEndDate(toDateInput(booking.endDate));
    setGroupSize(String(booking.groupSize));
    setError('');
  }, [booking]);

  const dirty = trekName.trim() !== booking.trekName
    || startDate !== toDateInput(booking.startDate)
    || endDate !== toDateInput(booking.endDate)
    || Number(groupSize) !== booking.groupSize;

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!trekName.trim()) { setError('Trek name is required'); return; }
    if (!startDate || !endDate) { setError('Both dates are required'); return; }
    if (new Date(`${endDate}T00:00:00`) <= new Date(`${startDate}T00:00:00`)) { setError('End date must be after the start date'); return; }
    const group = Number(groupSize);
    if (!Number.isInteger(group) || group < 1) { setError('Group size must be at least 1'); return; }
    setError('');
    update.mutate({
      trekName: trekName.trim(),
      startDate: new Date(`${startDate}T00:00:00`).toISOString(),
      endDate: new Date(`${endDate}T00:00:00`).toISOString(),
      groupSize: group,
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>Booking details</CardTitle></CardHeader>
      <CardContent>
        <form noValidate onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="booking-trek" className="text-sm font-medium text-fg-muted">Trek name</label>
              <Input id="booking-trek" maxLength={200} disabled={locked} value={trekName} onChange={(event) => setTrekName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="booking-start" className="text-sm font-medium text-fg-muted">Start date</label>
              <Input id="booking-start" type="date" disabled={locked} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="booking-end" className="text-sm font-medium text-fg-muted">End date</label>
              <Input id="booking-end" type="date" disabled={locked} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="booking-group" className="text-sm font-medium text-fg-muted">Group size</label>
              <Input id="booking-group" type="number" min={1} max={500} className="tabular-nums" disabled={locked}
                value={groupSize} onChange={(event) => setGroupSize(event.target.value)} />
            </div>
          </div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          {dirty && !locked ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={update.isPending}
                onClick={() => { setTrekName(booking.trekName); setStartDate(toDateInput(booking.startDate)); setEndDate(toDateInput(booking.endDate)); setGroupSize(String(booking.groupSize)); setError(''); }}>
                Discard
              </Button>
              <Button type="submit" size="sm" disabled={update.isPending}><CheckIcon size={16} />{update.isPending ? 'Saving...' : 'Save changes'}</Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function BookingEditForm({ booking, onDone }: { booking: BookingDetail; onDone: () => void }) {
  const [trekName, setTrekName] = useState(booking.trekName);
  const [startDate, setStartDate] = useState(toDateInput(booking.startDate));
  const [endDate, setEndDate] = useState(toDateInput(booking.endDate));
  const [groupSize, setGroupSize] = useState(String(booking.groupSize));
  const [error, setError] = useState('');
  const update = useUpdateBooking(booking.id);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!trekName.trim()) { setError('Trek name is required'); return; }
    if (!startDate || !endDate) { setError('Both dates are required'); return; }
    if (new Date(`${endDate}T00:00:00`) <= new Date(`${startDate}T00:00:00`)) { setError('End date must be after the start date'); return; }
    const group = Number(groupSize);
    if (!Number.isInteger(group) || group < 1) { setError('Group size must be at least 1'); return; }
    setError('');
    update.mutate({
      trekName: trekName.trim(),
      startDate: new Date(`${startDate}T00:00:00`).toISOString(),
      endDate: new Date(`${endDate}T00:00:00`).toISOString(),
      groupSize: group,
    }, { onSuccess: onDone });
  }

  return (
    <form noValidate onSubmit={save} className="space-y-4">
      <FormField htmlFor="booking-edit-trek" label="Trek name" required error={error && !trekName.trim() ? error : undefined}>
        <Input id="booking-edit-trek" maxLength={200} value={trekName} onChange={(event) => setTrekName(event.target.value)} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField htmlFor="booking-edit-start" label="Start date" required>
          <Input id="booking-edit-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </FormField>
        <FormField htmlFor="booking-edit-end" label="End date" required>
          <Input id="booking-edit-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </FormField>
      </div>
      <FormField htmlFor="booking-edit-group" label="Group size" required>
        <Input id="booking-edit-group" type="number" min={1} max={500} className="tabular-nums" value={groupSize} onChange={(event) => setGroupSize(event.target.value)} />
      </FormField>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="secondary" disabled={update.isPending} onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save changes'}</Button>
      </DialogFooter>
    </form>
  );
}

function PaymentsCard({ booking, onRecord }: { booking: BookingDetail; onRecord?: () => void }) {
  const canCreate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.PAYMENT_CREATE));
  const payments = booking.payments ?? [];
  const hasBalance = Number(booking.balanceAmount) > 0;
  const canRecord = canCreate && payable.has(booking.status) && hasBalance;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Payments</CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-xs text-fg-subtle">{payments.length} {payments.length === 1 ? 'payment' : 'payments'}</span>
          {canRecord && onRecord ? <Button type="button" size="sm" variant="secondary" onClick={onRecord}><PaymentIcon size={16} />Record payment</Button> : null}
          {!hasBalance ? <span className="inline-flex items-center gap-1 text-xs text-success"><SuccessIcon size={14} />Fully paid</span> : null}
        </div>
      </CardHeader>
      {payments.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Method</TableHead>
                <TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Evidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="whitespace-nowrap text-sm text-fg-muted">{formatDate(payment.receivedAt)}</TableCell>
                  <TableCell><PaymentTypeBadge paymentType={payment.paymentType} /></TableCell>
                  <TableCell className="text-sm text-fg-muted">{payment.method || '—'}</TableCell>
                  <TableCell className="text-sm text-fg-muted">{payment.reference || '—'}</TableCell>
                  <TableCell className="text-right"><PaymentAmount payment={payment} currency={booking.currency} /></TableCell>
                  <TableCell>
                    {payment.evidence ? (
                      <a href={payment.evidence} target="_blank" rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-sm text-accent hover:underline" aria-label="Open payment evidence">
                        View <ExternalLinkIcon size={14} />
                      </a>
                    ) : <span className="text-sm text-fg-subtle">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-fg-muted">No payments yet — record a deposit to get started</p>
      )}
    </Card>
  );
}

function Content({ booking }: { booking: BookingDetail }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.BOOKING_UPDATE));
  const canCancel = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.BOOKING_CANCEL));
  const canPay = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.PAYMENT_CREATE));
  const complete = useCompleteBooking(booking.id);

  // The bookings list deep-links here with ?action= for row-level shortcuts.
  const requested = searchParams.get('action');
  useEffect(() => {
    if (!requested) return;
    if (requested === 'pay' && canPay && payable.has(booking.status)) setPayOpen(true);
    if (requested === 'cancel' && canCancel && cancellable.has(booking.status)) setCancelOpen(true);
    if (requested === 'complete' && canUpdate && payable.has(booking.status)) setCompleteOpen(true);
    setSearchParams({}, { replace: true });
  }, [requested, booking.status, canPay, canCancel, canUpdate, setSearchParams]);

  const total = Number(booking.totalAmount);
  const paid = Number(booking.paidAmount);
  const balance = Number(booking.balanceAmount);
  const percent = total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 0;
  const percentLabel = Math.round(percent);
  const convertedTripId = typeof booking.metadata === 'object' && booking.metadata
    ? (booking.metadata as { tripId?: string }).tripId : undefined;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide tabular-nums text-fg-subtle">{booking.bookingNumber}</p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-fg">
            <CustomerName customerId={booking.customerId} />
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {booking.trekName} · {formatDateRange(booking.startDate, booking.endDate)} · {booking.groupSize} {booking.groupSize === 1 ? 'traveler' : 'travelers'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2"><BookingStatusBadge status={booking.status} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPay && payable.has(booking.status) && balance > 0 ? (
            <Button type="button" size="sm" onClick={() => setPayOpen(true)}><PaymentIcon size={16} />Record payment</Button>
          ) : null}
          {canUpdate && payable.has(booking.status) ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => setCompleteOpen(true)}><CheckIcon size={16} />Complete</Button>
          ) : null}
          {canCancel && cancellable.has(booking.status) ? (
            <Button type="button" size="sm" variant="ghost" className="text-danger hover:text-danger" onClick={() => setCancelOpen(true)}>Cancel booking</Button>
          ) : null}
          {canUpdate && !['CANCELLED', 'COMPLETED', 'REFUNDED'].includes(booking.status) ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => setEditOpen(true)}><EditIcon size={16} />Edit</Button>
          ) : null}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <main className="min-w-0 space-y-6">
          <Card>
            <CardHeader><CardTitle>Financial summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Total" value={formatCurrency(booking.totalAmount, booking.currency)} />
                <StatCard label="Paid" value={formatCurrency(booking.paidAmount, booking.currency)} tone={paid > 0 ? 'success' : 'default'} />
                <StatCard label="Balance" value={formatCurrency(booking.balanceAmount, booking.currency)} tone={balance > 0 ? 'danger' : 'success'} />
              </div>
              <div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100}
                  aria-valuenow={percentLabel} aria-label="Payment progress">
                  <div className="h-full bg-accent transition-[width] duration-base ease-standard" style={{ width: `${percent}%` }} />
                </div>
                <p className="mt-2 text-xs text-fg-muted">{percentLabel}% paid</p>
              </div>
            </CardContent>
          </Card>

          <PaymentsCard booking={booking} onRecord={canPay && payable.has(booking.status) && Number(booking.balanceAmount) > 0 ? () => setPayOpen(true) : undefined} />

          <BookingDetailsForm booking={booking} canUpdate={canUpdate} />
        </main>

        <aside className="space-y-6">
          <CustomerCard booking={booking} />
          <LinkedRecords booking={booking} tripId={convertedTripId} />
          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Created</dt>
                  <dd className="mt-0.5 tabular-nums text-fg">{formatDateTime(booking.createdAt)}</dd></div>
                {booking.confirmedAt ? <div><dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Confirmed</dt>
                  <dd className="mt-0.5 tabular-nums text-fg">{formatDateTime(booking.confirmedAt)}</dd></div> : null}
                {booking.cancelledAt ? <div><dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Cancelled</dt>
                  <dd className="mt-0.5 tabular-nums text-fg">{formatDateTime(booking.cancelledAt)}</dd></div> : null}
              </dl>
              {booking.cancellationReason ? (
                <p className="mt-3 rounded-md bg-bg-subtle px-3 py-2 text-xs text-fg-muted">
                  <span className="font-medium text-fg">Reason: </span>{booking.cancellationReason}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit booking</DialogTitle>
            <DialogDescription>Update the trek, dates or group size for {booking.bookingNumber}.</DialogDescription>
          </DialogHeader>
          <BookingEditForm booking={booking} onDone={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <RecordPaymentDialog booking={booking} open={payOpen} onOpenChange={setPayOpen} />
      <CancelBookingDialog bookingId={booking.id} bookingNumber={booking.bookingNumber} open={cancelOpen} onOpenChange={setCancelOpen} />

      <Dialog open={completeOpen} onOpenChange={(next) => { if (!complete.isPending) setCompleteOpen(next); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete this booking?</DialogTitle>
            <DialogDescription>
              {booking.bookingNumber} will be marked completed. {balance > 0 ? `A balance of ${formatCurrency(booking.balanceAmount, booking.currency)} is still outstanding.` : ''}
            </DialogDescription>
          </DialogHeader>
          <p className="flex items-start gap-2 text-xs text-fg-muted"><WarningIcon size={16} />This cannot be undone from the app.</p>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={complete.isPending} onClick={() => setCompleteOpen(false)}>Cancel</Button>
            <Button type="button" disabled={complete.isPending} onClick={() => complete.mutate(undefined, { onSuccess: () => setCompleteOpen(false) })}>
              {complete.isPending ? 'Completing...' : 'Complete booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function BookingDetailPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const booking = useBooking(bookingId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="link" asChild><Link to="/bookings">Back to bookings</Link></Button>
      {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view this booking.</p>
        : booking.isPending ? <div role="status" className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Skeleton className="h-72 w-full" /><Skeleton className="h-72 w-full" />
          </div>
        </div>
          : booking.isError ? <Card role="alert" className="p-6 text-sm text-fg-muted">
            Could not load this booking. <Button type="button" variant="link" onClick={() => booking.refetch()}>Try again</Button>
          </Card>
            : <Content key={`${workspaceId}:${booking.data.id}`} booking={booking.data} />}
    </div>
  );
}
