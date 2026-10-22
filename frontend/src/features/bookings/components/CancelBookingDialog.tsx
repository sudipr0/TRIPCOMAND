import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useCancelBooking } from '@/features/bookings/hooks/useBookings';

export interface CancelBookingDialogProps {
  bookingId: string;
  bookingNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelBookingDialog({ bookingId, bookingNumber, open, onOpenChange }: CancelBookingDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const cancel = useCancelBooking(bookingId);

  function close() {
    if (cancel.isPending) return;
    setReason('');
    setError('');
    onOpenChange(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (trimmed.length < 3) { setError('Enter at least 3 characters'); return; }
    if (trimmed.length > 500) { setError('Use 500 characters or fewer'); return; }
    cancel.mutate({ reason: trimmed }, { onSuccess: () => { setReason(''); setError(''); onOpenChange(false); } });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
          <DialogDescription>
            {bookingNumber} will be marked cancelled. Linked trips and supplier bookings may need separate cleanup.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit}>
          <FormField htmlFor="booking-cancellation-reason" label="Cancellation reason" required error={error}>
            <Textarea id="booking-cancellation-reason" rows={3} maxLength={500} value={reason} aria-invalid={Boolean(error)}
              placeholder="Customer postponed, permit unavailable..." onChange={(event) => { setReason(event.target.value); setError(''); }} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={cancel.isPending} onClick={close}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={cancel.isPending}>
              {cancel.isPending ? 'Cancelling...' : 'Cancel booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
