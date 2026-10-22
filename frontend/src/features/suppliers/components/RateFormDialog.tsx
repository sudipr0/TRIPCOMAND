import { useState } from 'react';
import type { SupplierRateDetail } from '@tripchange/shared';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useCreateRate, useUpdateRate } from '@/features/suppliers/hooks/useSuppliers';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const toInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const iso = (value: string) => (value ? new Date(`${value}T00:00:00`).toISOString() : null);
const orNull = (value: string) => (value.trim() ? value.trim() : null);

export function RateFormDialog({ supplierId, rate, open, onOpenChange }: {
  supplierId: string;
  rate?: SupplierRateDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = Boolean(rate);
  const create = useCreateRate(supplierId);
  const update = useUpdateRate(supplierId);
  const pending = create.isPending || update.isPending;

  const [serviceType, setServiceType] = useState(rate?.serviceType ?? '');
  const [description, setDescription] = useState(rate?.description ?? '');
  const [amount, setAmount] = useState(rate?.amount?.toString() ?? '');
  const [currency, setCurrency] = useState(rate?.currency ?? 'NPR');
  const [unit, setUnit] = useState(rate?.unit ?? '');
  const [validFrom, setValidFrom] = useState(toInput(rate?.validFrom));
  const [validTo, setValidTo] = useState(toInput(rate?.validTo));
  const [cancellationPolicy, setCancellationPolicy] = useState(rate?.cancellationPolicy ?? '');
  const [notes, setNotes] = useState(rate?.notes ?? '');
  const [error, setError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!serviceType.trim()) { setError('Service type is required'); return; }
    if (!unit.trim()) { setError('Unit is required'); return; }
    if (!amount.trim() || Number(amount) <= 0) { setError('Amount must be greater than 0'); return; }
    if (!validFrom) { setError('Valid from is required'); return; }
    if (validTo && validTo <= validFrom) { setError('Valid to must be after valid from'); return; }
    setError('');
    const payload = {
      serviceType: serviceType.trim(),
      description: orNull(description),
      amount: Number(amount),
      currency,
      unit: unit.trim(),
      validFrom: iso(validFrom)!,
      validTo: iso(validTo),
      cancellationPolicy: orNull(cancellationPolicy),
      notes: orNull(notes),
    };
    const done = { onSuccess: () => onOpenChange(false) };
    if (rate) update.mutate({ rateId: rate.id, input: payload }, done);
    else create.mutate(payload, done);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit rate' : 'Add rate'}</DialogTitle>
          <DialogDescription>Rates are validity-dated; expired rates stay on record but are hidden by default.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="rate-service-type" label="Service type" required>
              <Input id="rate-service-type" maxLength={100} placeholder="room_night" value={serviceType}
                onChange={(event) => setServiceType(event.target.value)} />
            </FormField>
            <FormField htmlFor="rate-unit" label="Unit" required>
              <Input id="rate-unit" maxLength={50} placeholder="per_room" value={unit}
                onChange={(event) => setUnit(event.target.value)} />
            </FormField>
          </div>
          <FormField htmlFor="rate-description" label="Description">
            <Input id="rate-description" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <FormField htmlFor="rate-amount" label="Amount" required>
              <Input id="rate-amount" type="number" min={0} step="any" className="tabular-nums" value={amount}
                onChange={(event) => setAmount(event.target.value)} />
            </FormField>
            <FormField htmlFor="rate-currency" label="Currency">
              <Select id="rate-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                <option value="NPR">NPR</option><option value="USD">USD</option><option value="EUR">EUR</option>
              </Select>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="rate-from" label="Valid from" required>
              <Input id="rate-from" type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} />
            </FormField>
            <FormField htmlFor="rate-to" label="Valid to">
              <Input id="rate-to" type="date" min={validFrom || undefined} value={validTo} onChange={(event) => setValidTo(event.target.value)} />
            </FormField>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate-policy">Cancellation policy</Label>
            <Textarea id="rate-policy" maxLength={1000} value={cancellationPolicy} onChange={(event) => setCancellationPolicy(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate-notes">Notes</Label>
            <Textarea id="rate-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save rate'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
