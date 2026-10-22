import type { SupplierBookingDetail } from '@tripchange/shared';
import { useState } from 'react';

import { WarningIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CostComparison } from '@/features/suppliers/components/CostComparison';
import {
  useCancelSupplierBooking, useConfirmSupplierBooking, useMarkSupplierNoShow, useRecordSupplierActualCost,
  useRecordSupplierQuote,
} from '@/features/suppliers/hooks/useSupplierBookings';
import { formatCurrency } from '@/lib/utils';

const num = (value: string) => (value.trim() ? Number(value) : 0);

export function RecordQuoteDialog({ booking, open, onOpenChange }: { booking: SupplierBookingDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const record = useRecordSupplierQuote();
  const [cost, setCost] = useState(booking.confirmedCost ?? '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!cost.trim() || num(cost) < 0) { setError('Enter the quoted cost'); return; }
    setError('');
    record.mutate({ bookingId: booking.id, input: { confirmedCost: num(cost), ...(notes.trim() ? { notes: notes.trim() } : {}) } },
      { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!record.isPending) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record supplier quote</DialogTitle>
          <DialogDescription>{booking.supplier?.name} quoted for {booking.description}.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quote-cost">Quoted cost ({booking.currency})</Label>
            <Input id="quote-cost" type="number" min={0} step="any" className="tabular-nums" value={cost} onChange={(event) => setCost(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-notes">Notes</Label>
            <Textarea id="quote-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={record.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={record.isPending}>{record.isPending ? 'Saving...' : 'Record quote'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmSupplierBookingDialog({ booking, open, onOpenChange }: { booking: SupplierBookingDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const confirm = useConfirmSupplierBooking();
  const [confirmationNumber, setConfirmationNumber] = useState(booking.confirmationNumber ?? '');
  const [cost, setCost] = useState(booking.confirmedCost ?? '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const canSubmit = confirmationNumber.trim().length > 0 && cost.trim().length > 0 && num(cost) >= 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!confirmationNumber.trim()) { setError('Confirmation number is required'); return; }
    if (!cost.trim()) { setError('Confirmed cost is required'); return; }
    setError('');
    confirm.mutate({
      bookingId: booking.id,
      input: { confirmationNumber: confirmationNumber.trim(), confirmedCost: num(cost), ...(notes.trim() ? { notes: notes.trim() } : {}) },
    }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!confirm.isPending) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm supplier booking</DialogTitle>
          <DialogDescription>
            Enter the supplier&rsquo;s confirmation number. The booking becomes confirmed and costs are locked to this figure.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-number">Confirmation number <span className="text-danger">*</span></Label>
            <Input id="confirm-number" maxLength={100} placeholder="e.g. HILLTOP-2026-1234" value={confirmationNumber}
              onChange={(event) => setConfirmationNumber(event.target.value)} aria-invalid={!confirmationNumber.trim()} />
            <p className="text-xs text-fg-subtle">Required — the booking cannot be confirmed without it.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-cost">Confirmed cost ({booking.currency}) <span className="text-danger">*</span></Label>
            <Input id="confirm-cost" type="number" min={0} step="any" className="tabular-nums" value={cost}
              onChange={(event) => setCost(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-notes">Notes</Label>
            <Textarea id="confirm-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={confirm.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={confirm.isPending || !canSubmit}>{confirm.isPending ? 'Confirming...' : 'Confirm booking'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CancelSupplierBookingDialog({ booking, open, onOpenChange }: { booking: SupplierBookingDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const cancel = useCancelSupplierBooking();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const deadlinePassed = booking.cancellationDeadline ? new Date(booking.cancellationDeadline).getTime() < Date.now() : false;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 5) { setError('Give a reason of at least 5 characters'); return; }
    setError('');
    cancel.mutate({ bookingId: booking.id, input: { reason: reason.trim() } }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!cancel.isPending) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel supplier booking</DialogTitle>
          <DialogDescription>This cannot be undone. Costs may still apply per the cancellation policy.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          {deadlinePassed ? (
            <p className="flex items-start gap-2 rounded-md border border-danger bg-bg-subtle px-3 py-2 text-xs text-danger">
              <WarningIcon size={14} className="mt-0.5 shrink-0" />Cancellation deadline has passed — cancellation fees may apply.
            </p>
          ) : null}
          {booking.cancellationPolicy ? (
            <p className="rounded-md bg-bg-subtle px-3 py-2 text-xs text-fg-muted">{booking.cancellationPolicy}</p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason</Label>
            <Textarea id="cancel-reason" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={cancel.isPending} onClick={() => onOpenChange(false)}>Keep booking</Button>
            <Button type="submit" variant="danger" disabled={cancel.isPending || reason.trim().length < 5}>{cancel.isPending ? 'Cancelling...' : 'Cancel booking'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RecordActualCostDialog({ booking, open, onOpenChange }: { booking: SupplierBookingDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const record = useRecordSupplierActualCost();
  const [cost, setCost] = useState(booking.actualCost ?? booking.confirmedCost ?? '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const variance = booking.confirmedCost && cost.trim() ? num(cost) - Number(booking.confirmedCost) : 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!cost.trim() || num(cost) < 0) { setError('Enter the actual cost'); return; }
    setError('');
    record.mutate({ bookingId: booking.id, input: { actualCost: num(cost), ...(notes.trim() ? { notes: notes.trim() } : {}) } },
      { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!record.isPending) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record actual cost</DialogTitle>
          <DialogDescription>{booking.supplier?.name} · {booking.description}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="rounded-md border border-border px-3 py-2">
            <CostComparison estimated={booking.estimatedCost} confirmed={booking.confirmedCost} actual={booking.actualCost} currency={booking.currency} layout="columns" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="actual-cost">Actual cost ({booking.currency})</Label>
            <Input id="actual-cost" type="number" min={0} step="any" className="tabular-nums" value={cost}
              onChange={(event) => setCost(event.target.value)} />
            {booking.confirmedCost && cost.trim() ? (
              <p className={`text-xs tabular-nums ${variance === 0 ? 'text-fg-subtle' : variance > 0 ? 'text-danger' : 'text-success'}`}>
                {variance === 0 ? 'Matches the confirmed cost'
                  : `${variance > 0 ? 'Over' : 'Under'} by ${formatCurrency(Math.abs(variance), booking.currency)} vs confirmed`}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="actual-notes">Notes</Label>
            <Textarea id="actual-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={record.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={record.isPending}>{record.isPending ? 'Saving...' : 'Record actual cost'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MarkNoShowDialog({ booking, open, onOpenChange }: { booking: SupplierBookingDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const noShow = useMarkSupplierNoShow();
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!noShow.isPending) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as no-show?</DialogTitle>
          <DialogDescription>
            {booking.supplier?.name} did not provide {booking.description}. This is a terminal state.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={noShow.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" variant="danger" disabled={noShow.isPending}
            onClick={() => noShow.mutate({ bookingId: booking.id }, { onSuccess: () => onOpenChange(false) })}>
            {noShow.isPending ? 'Saving...' : 'Mark no-show'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
