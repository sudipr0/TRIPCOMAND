import { useState } from 'react';
import type { TripDetail } from '@trailcomand/shared';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fromDateInput, toDateInput } from '@/lib/utils';
import { useUpdateTrip } from '@/features/trips/hooks/useTrips';
import { FormField } from '@/features/auth/components/FormField';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Trips are created by the backend when a booking is converted, so this dialog only edits.
 */
export function TripFormDialog({ trip, open, onOpenChange }: {
  trip: TripDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateTrip(trip.id);
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(toDateInput(trip.startDate));
  const [endDate, setEndDate] = useState(toDateInput(trip.endDate));
  const [groupSize, setGroupSize] = useState(String(trip.groupSize));
  const [error, setError] = useState('');

  function close(next: boolean) {
    if (update.isPending) return;
    if (!next) {
      setName(trip.name);
      setStartDate(toDateInput(trip.startDate));
      setEndDate(toDateInput(trip.endDate));
      setGroupSize(String(trip.groupSize));
      setError('');
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setError('Trip name is required'); return; }
    if (!startDate || !endDate) { setError('Both dates are required'); return; }
    if (new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`)) { setError('End date must be on or after the start date'); return; }
    const group = Number(groupSize);
    if (!Number.isInteger(group) || group < 1) { setError('Group size must be at least 1'); return; }
    setError('');
    update.mutate({
      name: name.trim(),
      startDate: fromDateInput(startDate),
      endDate: fromDateInput(endDate),
      groupSize: group,
    }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit trip</DialogTitle>
          <DialogDescription>Update the name, dates or group size for {trip.tripNumber}.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          <FormField htmlFor="trip-edit-name" label="Trip name" required>
            <Input id="trip-edit-name" maxLength={200} value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="trip-edit-start" label="Start date" required>
              <Input id="trip-edit-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </FormField>
            <FormField htmlFor="trip-edit-end" label="End date" required>
              <Input id="trip-edit-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </FormField>
          </div>
          <FormField htmlFor="trip-edit-group" label="Group size" required>
            <Input id="trip-edit-group" type="number" min={1} max={500} className="tabular-nums" value={groupSize} onChange={(event) => setGroupSize(event.target.value)} />
          </FormField>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={update.isPending} onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Save changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
