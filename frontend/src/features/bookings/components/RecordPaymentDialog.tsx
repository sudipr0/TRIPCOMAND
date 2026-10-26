import { useState } from 'react';
import { PAYMENT_TYPES, type BookingDetail, type PaymentType } from '@trailcomand/shared';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { formatCurrency, fromDateInput, todayInput } from '@/lib/utils';
import { useRecordPayment } from '@/features/bookings/hooks/useBookings';
import { paymentTypeLabels } from '@/features/bookings/components/BookingBadges';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const METHODS = ['Cash', 'Bank Transfer', 'Card', 'Online', 'Other'] as const;

export interface RecordPaymentDialogProps {
  booking: BookingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Records a payment against a booking. The backend stores REFUND amounts positive and
 * subtracts them from paidAmount, so the form always sends a positive number.
 */
export function RecordPaymentDialog({ booking, open, onOpenChange }: RecordPaymentDialogProps) {
  const [paymentType, setPaymentType] = useState<PaymentType>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('Bank Transfer');
  const [reference, setReference] = useState('');
  const [receivedAt, setReceivedAt] = useState(todayInput());
  const [evidence, setEvidence] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const record = useRecordPayment(booking.id);

  const balance = Number(booking.balanceAmount);
  const paid = Number(booking.paidAmount);
  const isRefund = paymentType === 'REFUND';

  function reset() {
    setPaymentType('DEPOSIT'); setAmount(''); setMethod('Bank Transfer'); setReference('');
    setReceivedAt(todayInput()); setEvidence(''); setNotes(''); setError('');
  }

  function close() {
    if (record.isPending) return;
    reset();
    onOpenChange(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) { setError('Enter an amount greater than zero'); return; }
    if (!receivedAt) { setError('Choose the date the payment was received'); return; }

    // Advisory checks only — the backend is the source of truth and errors are surfaced below.
    record.mutate({
      amount: value,
      currency: booking.currency,
      paymentType,
      method: method.trim() || null,
      reference: reference.trim() || null,
      receivedAt: fromDateInput(receivedAt),
      evidence: evidence.trim() || null,
      notes: notes.trim() || null,
    }, {
      onSuccess: () => { reset(); onOpenChange(false); },
      onError: (mutationError) => {
        setError(mutationError instanceof Error ? mutationError.message : 'Could not record the payment');
      },
    });
  }

  const overBalance = !isRefund && amount.trim() !== '' && Number(amount) > Math.max(0, balance);
  const overPaid = isRefund && amount.trim() !== '' && Number(amount) > Math.max(0, paid);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>{booking.bookingNumber} · Balance {formatCurrency(booking.balanceAmount, booking.currency)}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="payment-type" label="Payment type" required>
              <Select id="payment-type" value={paymentType} onChange={(event) => { setPaymentType(event.target.value as PaymentType); setError(''); }}>
                {PAYMENT_TYPES.map((type) => <option key={type} value={type}>{paymentTypeLabels[type] ?? type}</option>)}
              </Select>
            </FormField>
            <FormField htmlFor="payment-amount" label={isRefund ? 'Refund amount' : 'Amount'} required
              hint={isRefund ? `Paid so far ${formatCurrency(booking.paidAmount, booking.currency)}` : `Balance ${formatCurrency(booking.balanceAmount, booking.currency)}`}>
              <Input id="payment-amount" type="number" min={0} step="any" className="tabular-nums" value={amount}
                aria-invalid={Boolean(overBalance || overPaid)} onChange={(event) => { setAmount(event.target.value); setError(''); }} />
            </FormField>
          </div>

          {overBalance ? <p className="text-xs text-warning">This exceeds the remaining balance. The backend will accept it and the balance will go negative.</p> : null}
          {overPaid ? <p className="text-xs text-warning">This refund exceeds the amount paid so far.</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="payment-method" label="Method">
              <Select id="payment-method" value={method} onChange={(event) => setMethod(event.target.value)}>
                {METHODS.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </FormField>
            <FormField htmlFor="payment-date" label="Received on" required>
              <Input id="payment-date" type="date" value={receivedAt} onChange={(event) => { setReceivedAt(event.target.value); setError(''); }} />
            </FormField>
            <FormField htmlFor="payment-reference" label="Reference">
              <Input id="payment-reference" maxLength={120} placeholder="Bank slip or voucher no." value={reference}
                onChange={(event) => setReference(event.target.value)} />
            </FormField>
            <FormField htmlFor="payment-evidence" label="Evidence URL" hint="File upload arrives in a later phase">
              <Input id="payment-evidence" type="url" maxLength={500} placeholder="https://" value={evidence}
                onChange={(event) => setEvidence(event.target.value)} />
            </FormField>
          </div>

          <FormField htmlFor="payment-notes" label="Notes">
            <Textarea id="payment-notes" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </FormField>

          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="secondary" disabled={record.isPending} onClick={close}>Cancel</Button>
            <Button type="submit" disabled={record.isPending}>{record.isPending ? 'Recording...' : 'Record payment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
