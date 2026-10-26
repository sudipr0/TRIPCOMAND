import { useState } from 'react';
import { SUPPLIER_CATEGORIES, type SupplierCategory, type TripDetail } from '@trailcomand/shared';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { SpinnerIcon } from '@/components/icons';
import { Textarea } from '@/components/ui/textarea';
import { fromDateInput, toDateInput } from '@/lib/utils';
import { FormField } from '@/features/auth/components/FormField';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { useCreateSupplierBooking } from '@/features/suppliers/hooks/useSupplierBookings';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const orNull = (value: string) => (value.trim() ? value.trim() : null);
const categoryLabel = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

export function BookSupplierDialog({ trip, open, onOpenChange }: {
  trip: TripDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const activeOnly = useSuppliers({ status: 'ACTIVE', limit: 100, offset: 0 });
  const create = useCreateSupplierBooking();
  const tripStart = toDateInput(trip.startDate);
  const tripEnd = toDateInput(trip.endDate);

  const [supplierId, setSupplierId] = useState('');
  const [serviceType, setServiceType] = useState<SupplierCategory>('ACCOMMODATION');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [itineraryDayId, setItineraryDayId] = useState('');
  const [serviceDate, setServiceDate] = useState(tripStart);
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('rooms');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [currency, setCurrency] = useState('NPR');
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  const [cancellationDeadline, setCancellationDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const days = trip.itineraryDays ?? [];

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supplierId) { setError('Select a supplier'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    if (!serviceDate) { setError('Service date is required'); return; }
    if (serviceDate < tripStart || serviceDate > tripEnd) { setError('Service date must fall within the trip dates'); return; }
    if (endDate && endDate < serviceDate) { setError('End date must be on or after the service date'); return; }
    if (cancellationDeadline && cancellationDeadline > serviceDate) { setError('Cancellation deadline must be on or before the service date'); return; }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) { setError('Quantity must be at least 1'); return; }
    setError('');
    create.mutate({
      tripId: trip.id,
      supplierId,
      itineraryDayId: itineraryDayId || undefined,
      serviceType,
      description: description.trim(),
      code: orNull(code),
      serviceDate: fromDateInput(serviceDate),
      endDate: endDate ? fromDateInput(endDate) : null,
      startTime: orNull(startTime),
      endTime: orNull(endTime),
      quantity: qty,
      unit: orNull(unit),
      estimatedCost: estimatedCost.trim() ? Number(estimatedCost) : undefined,
      currency,
      cancellationPolicy: orNull(cancellationPolicy),
      cancellationDeadline: cancellationDeadline ? fromDateInput(cancellationDeadline) : null,
      notes: orNull(notes),
    }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!create.isPending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book supplier</DialogTitle>
          <DialogDescription>Record a supplier service for {trip.tripNumber}. It starts as an inquiry.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Supplier and service</h3>
            {activeOnly.isPending ? (
              <p role="status" className="flex items-center gap-2 text-sm text-fg-muted"><SpinnerIcon size={16} className="animate-spin" />Loading suppliers...</p>
            ) : !activeOnly.data?.items.length ? (
              <p className="text-sm text-fg-muted">No active suppliers. Add a supplier first.</p>
            ) : (
              <FormField htmlFor="sb-supplier" label="Supplier" required>
                <Select id="sb-supplier" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); const picked = activeOnly.data?.items.find((item) => item.id === event.target.value); if (picked) setServiceType(picked.category as SupplierCategory); }}>
                  <option value="">Select supplier</option>
                  {activeOnly.data.items.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}{supplier.region ? ` · ${supplier.region}` : ''}</option>
                  ))}
                </Select>
              </FormField>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="sb-service-type" label="Service type" required>
                <Select id="sb-service-type" value={serviceType} onChange={(event) => setServiceType(event.target.value as SupplierCategory)}>
                  {SUPPLIER_CATEGORIES.map((option) => <option key={option} value={option}>{categoryLabel(option)}</option>)}
                </Select>
              </FormField>
              <FormField htmlFor="sb-code" label="Supplier reference">
                <Input id="sb-code" maxLength={50} value={code} onChange={(event) => setCode(event.target.value)} />
              </FormField>
            </div>
            <FormField htmlFor="sb-description" label="Description" required>
              <Input id="sb-description" maxLength={500} placeholder="Twin room, 2 nights" value={description}
                onChange={(event) => setDescription(event.target.value)} />
            </FormField>
            <FormField htmlFor="sb-day" label="Itinerary day">
              <Select id="sb-day" value={itineraryDayId} onChange={(event) => setItineraryDayId(event.target.value)}>
                <option value="">Not linked to a day</option>
                {days.map((day) => <option key={day.id} value={day.id}>Day {day.dayNumber} · {day.title}</option>)}
              </Select>
            </FormField>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Dates</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="sb-service-date" label="Service date" required>
                <Input id="sb-service-date" type="date" min={tripStart} max={tripEnd} value={serviceDate}
                  onChange={(event) => setServiceDate(event.target.value)} />
              </FormField>
              <FormField htmlFor="sb-end-date" label="End date">
                <Input id="sb-end-date" type="date" min={serviceDate || tripStart} max={tripEnd} value={endDate}
                  onChange={(event) => setEndDate(event.target.value)} />
              </FormField>
              <FormField htmlFor="sb-start-time" label="Start time">
                <Input id="sb-start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </FormField>
              <FormField htmlFor="sb-end-time" label="End time">
                <Input id="sb-end-time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </FormField>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Quantity and cost</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="sb-quantity" label="Quantity">
                <Input id="sb-quantity" type="number" min={1} className="tabular-nums" value={quantity}
                  onChange={(event) => setQuantity(event.target.value)} />
              </FormField>
              <FormField htmlFor="sb-unit" label="Unit">
                <Input id="sb-unit" maxLength={30} placeholder="rooms" value={unit} onChange={(event) => setUnit(event.target.value)} />
              </FormField>
              <FormField htmlFor="sb-estimated" label="Estimated cost">
                <Input id="sb-estimated" type="number" min={0} step="any" className="tabular-nums" value={estimatedCost}
                  onChange={(event) => setEstimatedCost(event.target.value)} />
              </FormField>
              <FormField htmlFor="sb-currency" label="Currency">
                <Select id="sb-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="NPR">NPR</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </Select>
              </FormField>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Cancellation</h3>
            <div className="space-y-2">
              <Label htmlFor="sb-policy">Cancellation policy</Label>
              <Textarea id="sb-policy" maxLength={1000} value={cancellationPolicy} onChange={(event) => setCancellationPolicy(event.target.value)} />
            </div>
            <FormField htmlFor="sb-deadline" label="Cancellation deadline">
              <Input id="sb-deadline" type="date" max={serviceDate || tripEnd} value={cancellationDeadline}
                onChange={(event) => setCancellationDeadline(event.target.value)} />
            </FormField>
          </section>

          <div className="space-y-2">
            <Label htmlFor="sb-notes">Notes</Label>
            <Textarea id="sb-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={create.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !supplierId}>{create.isPending ? 'Booking...' : 'Book supplier'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
