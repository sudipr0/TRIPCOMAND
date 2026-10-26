import { useState } from 'react';
import type { SupplierBookingDetail, TripDetail } from '@trailcomand/shared';

import { differenceInHours } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatDateRange } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DeadlineBadge } from '@/features/suppliers/components/DeadlineBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CostComparison } from '@/features/suppliers/components/CostComparison';
import { useSupplierBookings } from '@/features/suppliers/hooks/useSupplierBookings';
import { SupplierCategoryBadge } from '@/features/suppliers/components/SupplierBadges';
import { BookSupplierDialog } from '@/features/suppliers/components/BookSupplierDialog';
import { useRequestSupplierQuote } from '@/features/suppliers/hooks/useSupplierBookings';
import { MarkNoShowDialog } from '@/features/suppliers/components/SupplierBookingDialogs';
import { useDeleteSupplierBooking } from '@/features/suppliers/hooks/useSupplierBookings';
import { RecordQuoteDialog } from '@/features/suppliers/components/SupplierBookingDialogs';
import { useMarkSupplierInProgress } from '@/features/suppliers/hooks/useSupplierBookings';
import { useCompleteSupplierBooking } from '@/features/suppliers/hooks/useSupplierBookings';
import { RecordActualCostDialog } from '@/features/suppliers/components/SupplierBookingDialogs';
import { DeleteIcon, EditIcon, SpinnerIcon, SupplierIcon, WarningIcon } from '@/components/icons';
import { CancelSupplierBookingDialog } from '@/features/suppliers/components/SupplierBookingDialogs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmSupplierBookingDialog } from '@/features/suppliers/components/SupplierBookingDialogs';
import { SupplierBookingStatusBadge, supplierBookingActions } from '@/features/suppliers/components/SupplierBookingStatusBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type DialogKind = 'quote' | 'confirm' | 'cancel' | 'actual' | 'noshow' | null;

function ServiceDates({ booking }: { booking: SupplierBookingDetail }) {
  return (
    <div>
      <p className="whitespace-nowrap text-xs text-fg-muted">
        {booking.endDate ? formatDateRange(booking.serviceDate, booking.endDate) : formatDate(booking.serviceDate)}
        {booking.startTime ? <span className="ml-1 tabular-nums text-fg-subtle">{booking.startTime}</span> : null}
      </p>
      {booking.cancellationDeadline ? (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-fg-subtle">Cancel by</span>
          <DeadlineBadge deadline={booking.cancellationDeadline} />
        </div>
      ) : null}
    </div>
  );
}

export function SuppliersTab({ trip }: { trip: TripDetail }) {
  const bookings = useSupplierBookings(trip.id);
  const requestQuote = useRequestSupplierQuote();
  const markInProgress = useMarkSupplierInProgress();
  const complete = useCompleteSupplierBooking();
  const remove = useDeleteSupplierBooking();
  const [bookOpen, setBookOpen] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [active, setActive] = useState<SupplierBookingDetail | null>(null);
  const [deleting, setDeleting] = useState<SupplierBookingDetail | null>(null);

  const all = bookings.data ?? [];
  const visible = all.filter((booking) => showCancelled || !['CANCELLED', 'NO_SHOW'].includes(booking.status));
  const confirmedCount = all.filter((booking) => booking.status === 'CONFIRMED').length;
  const upcoming = all.filter((booking) => booking.cancellationDeadline
    && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(booking.status)
    && differenceInHours(new Date(booking.cancellationDeadline), new Date()) <= 72);

  function open(kind: DialogKind, booking: SupplierBookingDetail) {
    setActive(booking);
    setDialog(kind);
  }
  function close() { setDialog(null); setActive(null); }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Supplier bookings</CardTitle>
          <span className="text-xs text-fg-subtle">{all.length} {all.length === 1 ? 'booking' : 'bookings'}</span>
          <span className="text-xs text-success">{confirmedCount} confirmed</span>
        </div>
        <Button type="button" size="sm" onClick={() => setBookOpen(true)}>Book supplier</Button>
      </CardHeader>

      {upcoming.length ? (
        <CardContent className="pb-0">
          <div className="rounded-md border border-warning bg-bg-subtle px-3 py-2">
            <p className="flex items-center gap-2 text-sm font-medium text-warning">
              <WarningIcon size={16} aria-hidden="true" />
              {upcoming.length} cancellation {upcoming.length === 1 ? 'deadline' : 'deadlines'} approaching
            </p>
            <ul className="mt-1 space-y-0.5">
              {upcoming.map((booking) => (
                <li key={booking.id} className="flex items-center justify-between gap-2 text-xs text-fg-muted">
                  <span className="truncate">{booking.supplier?.name} · {booking.description}</span>
                  <DeadlineBadge deadline={booking.cancellationDeadline} />
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      ) : null}

      {bookings.isPending ? (
        <CardContent><p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-fg-muted"><SpinnerIcon size={18} className="animate-spin" />Loading supplier bookings...</p></CardContent>
      ) : bookings.isError ? (
        <CardContent><p role="alert" className="text-sm text-fg-muted">Could not load supplier bookings. <Button type="button" variant="link" onClick={() => bookings.refetch()}>Try again</Button></p></CardContent>
      ) : !visible.length ? (
        <CardContent>
          <EmptyState icon={SupplierIcon} title={all.length ? 'No active supplier bookings' : 'No supplier bookings yet'}
            description={all.length
              ? 'All bookings for this trip are cancelled or no-shows. Use the toggle below to review them.'
              : 'Book lodges, transport, and other suppliers for this trip.'}
            action={<Button type="button" onClick={() => setBookOpen(true)}>Book supplier</Button>} />
          {all.some((booking) => ['CANCELLED', 'NO_SHOW'].includes(booking.status)) ? (
            <div className="mt-4 flex items-center justify-center gap-2 border-t border-border pt-3">
              <span className="text-xs text-fg-muted">Show cancelled</span>
              <Switch aria-label="Show cancelled" checked={showCancelled} onCheckedChange={setShowCancelled} />
            </div>
          ) : null}
        </CardContent>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead><TableHead>Service</TableHead><TableHead>Dates</TableHead>
                  <TableHead>Cost</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((booking) => {
                  const actions = supplierBookingActions(booking.status, Boolean(booking.actualCost));
                  const anyAction = actions.requestQuote || actions.recordQuote || actions.confirm || actions.markInProgress
                    || actions.complete || actions.recordActualCost || actions.markNoShow || actions.cancel || actions.remove;
                  return (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <p className="text-sm font-medium text-fg">{booking.supplier?.name ?? 'Supplier unavailable'}</p>
                        <div className="mt-0.5">
                          <SupplierCategoryBadge category={booking.supplier?.category ?? booking.serviceType} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="line-clamp-1 text-sm text-fg">{booking.description}</p>
                        <p className="text-xs text-fg-muted">{booking.serviceType}{booking.code ? ` · ${booking.code}` : ''}</p>
                      </TableCell>
                      <TableCell><ServiceDates booking={booking} /></TableCell>
                      <TableCell><CostComparison estimated={booking.estimatedCost} confirmed={booking.confirmedCost} actual={booking.actualCost} currency={booking.currency} /></TableCell>
                      <TableCell><SupplierBookingStatusBadge status={booking.status} /></TableCell>
                      <TableCell className="text-right">
                        {anyAction ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${booking.supplier?.name ?? 'booking'}`}><EditIcon size={16} /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {actions.requestQuote ? <DropdownMenuItem onSelect={() => requestQuote.mutate({ bookingId: booking.id })}>Request quote</DropdownMenuItem> : null}
                              {actions.recordQuote ? <DropdownMenuItem onSelect={() => open('quote', booking)}>Record quote</DropdownMenuItem> : null}
                              {actions.confirm ? <DropdownMenuItem onSelect={() => open('confirm', booking)}>Confirm booking</DropdownMenuItem> : null}
                              {actions.markInProgress ? <DropdownMenuItem onSelect={() => markInProgress.mutate({ bookingId: booking.id })}>Mark in progress</DropdownMenuItem> : null}
                              {actions.complete ? <DropdownMenuItem onSelect={() => complete.mutate({ bookingId: booking.id })}>Complete</DropdownMenuItem> : null}
                              {actions.recordActualCost ? <DropdownMenuItem onSelect={() => open('actual', booking)}>Record actual cost</DropdownMenuItem> : null}
                              {actions.markNoShow ? <DropdownMenuItem onSelect={() => open('noshow', booking)}>Mark no-show</DropdownMenuItem> : null}
                              {actions.cancel ? <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => open('cancel', booking)}>Cancel</DropdownMenuItem> : null}
                              {actions.remove ? (
                                <><DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setDeleting(booking)}>
                                    <DeleteIcon size={16} />Delete
                                  </DropdownMenuItem></>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : <span className="text-xs text-fg-subtle">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {all.some((booking) => ['CANCELLED', 'NO_SHOW'].includes(booking.status)) ? (
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-2">
              <span className="text-xs text-fg-muted">Show cancelled</span>
              <Switch aria-label="Show cancelled" checked={showCancelled} onCheckedChange={setShowCancelled} />
            </div>
          ) : null}
        </>
      )}

      {bookOpen ? <BookSupplierDialog key="book" trip={trip} open onOpenChange={setBookOpen} /> : null}
      {dialog === 'quote' && active ? <RecordQuoteDialog booking={active} open onOpenChange={close} /> : null}
      {dialog === 'confirm' && active ? <ConfirmSupplierBookingDialog booking={active} open onOpenChange={close} /> : null}
      {dialog === 'cancel' && active ? <CancelSupplierBookingDialog booking={active} open onOpenChange={close} /> : null}
      {dialog === 'actual' && active ? <RecordActualCostDialog booking={active} open onOpenChange={close} /> : null}
      {dialog === 'noshow' && active ? <MarkNoShowDialog booking={active} open onOpenChange={close} /> : null}

      {deleting ? (
        <ConfirmDialog open onOpenChange={(next) => { if (!next) setDeleting(null); }}
          title="Delete this booking?" description={`Remove ${deleting.supplier?.name ?? 'this booking'} from the trip. It stays in the audit history.`}
          confirmLabel="Delete booking" variant="danger"
          onConfirm={async () => { await remove.mutateAsync(deleting.id); setDeleting(null); }} />
      ) : null}
    </Card>
  );
}
