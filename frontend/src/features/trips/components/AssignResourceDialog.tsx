import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import type { TripDetail } from '@tripchange/shared';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { extractError } from '@/lib/api-client';
import { SpinnerIcon } from '@/components/icons';
import { Textarea } from '@/components/ui/textarea';
import { toDateInput, fromDateInput } from '@/lib/utils';
import { FormField } from '@/features/auth/components/FormField';
import { useResources } from '@/features/resources/hooks/useResources';
import { useCreateResourceAssignment, useResourceAvailability } from '@/features/trips/hooks/useTrips';
import { AvailabilityBanner, ConflictBanner, type ConflictItem } from '@/features/trips/components/ConflictBanner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const daysBetween = (start: string, end: string) => {
  if (!start || !end) return 0;
  return Math.floor((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000) + 1;
};

function resourceSummary(resource: { type: string; vehicleType?: string | null; licensePlate?: string | null; quantity?: number | null }) {
  if (resource.type === 'VEHICLE') return [resource.vehicleType, resource.licensePlate].filter(Boolean).join(' · ') || 'Vehicle';
  if (resource.type === 'EQUIPMENT') return `Quantity ${resource.quantity ?? '—'}`;
  return 'Resource';
}

export function AssignResourceDialog({ trip, open, onOpenChange }: {
  trip: TripDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const resources = useResources({ limit: 100, offset: 0 });
  const create = useCreateResourceAssignment(trip.id);
  const tripStart = toDateInput(trip.startDate);
  const tripEnd = toDateInput(trip.endDate);

  const [resourceId, setResourceId] = useState('');
  const [startDate, setStartDate] = useState(tripStart);
  const [endDate, setEndDate] = useState(tripEnd);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [serverConflicts, setServerConflicts] = useState<ConflictItem[]>([]);

  const dateValid = Boolean(startDate && endDate && endDate >= startDate);
  // The availability endpoint expects full ISO datetimes; date-only input would be rejected.
  const availability = useResourceAvailability(resourceId || undefined, dateValid ? fromDateInput(startDate) : undefined, dateValid ? fromDateInput(endDate) : undefined);

  const conflicts: ConflictItem[] = serverConflicts.length
    ? serverConflicts
    : availability.data && !availability.data.available ? availability.data.conflictingAssignments : [];
  const blocked = conflicts.length > 0;

  useEffect(() => { setServerConflicts([]); }, [resourceId, startDate, endDate]);

  // Inactive resources cannot be assigned; maintenance items are still assignable but flagged.
  const candidates = (resources.data?.items ?? []).filter((resource) => resource.status !== 'INACTIVE');
  const selected = candidates.find((resource) => resource.id === resourceId);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!resourceId) { setError('Select a resource'); return; }
    if (!startDate || !endDate) { setError('Both dates are required'); return; }
    if (endDate < startDate) { setError('End date must be on or after the start date'); return; }
    if (startDate < tripStart || endDate > tripEnd) { setError('Assignment dates must fall within the trip dates'); return; }
    if (blocked) { toast.error('Resolve the conflict before assigning'); return; }
    setError('');
    create.mutate({
      tripId: trip.id,
      resourceId,
      startDate: fromDateInput(startDate),
      endDate: fromDateInput(endDate),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    }, {
      onSuccess: () => onOpenChange(false),
      onError: (mutationError) => {
        const details = extractError(mutationError)?.details as { code?: string; conflicts?: ConflictItem[] } | undefined;
        if (details?.code === 'RESOURCE_CONFLICT' && details.conflicts?.length) setServerConflicts(details.conflicts);
        else setError(extractError(mutationError)?.message ?? 'Could not assign the resource');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!create.isPending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign resource</DialogTitle>
          <DialogDescription>Assign a vehicle or equipment item to {trip.tripNumber}.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Resource</h3>
            {resources.isPending ? (
              <p role="status" className="flex items-center gap-2 text-sm text-fg-muted"><SpinnerIcon size={16} className="animate-spin" />Loading resources...</p>
            ) : !candidates.length ? (
              <p className="text-sm text-fg-muted">No resources yet. Add a vehicle or equipment item first.</p>
            ) : (
              <FormField htmlFor="assign-resource" label="Resource" required>
                <Select id="assign-resource" value={resourceId} onChange={(event) => setResourceId(event.target.value)}>
                  <option value="">Select resource</option>
                  {candidates.map((resource) => (
                    <option key={resource.id} value={resource.id}>{resource.name} · {resourceSummary(resource)}</option>
                  ))}
                </Select>
              </FormField>
            )}
            {selected?.status === 'MAINTENANCE' ? (
              <p className="text-xs text-warning">This resource is marked for maintenance.</p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Dates</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="assign-resource-start" label="Start date" required>
                <Input id="assign-resource-start" type="date" min={tripStart} max={tripEnd} value={startDate}
                  onChange={(event) => setStartDate(event.target.value)} />
              </FormField>
              <FormField htmlFor="assign-resource-end" label="End date" required>
                <Input id="assign-resource-end" type="date" min={tripStart} max={tripEnd} value={endDate}
                  onChange={(event) => setEndDate(event.target.value)} />
              </FormField>
            </div>
            {dateValid ? <p className="text-xs text-fg-subtle">{daysBetween(startDate, endDate)} days within the trip</p> : null}

            {resourceId && dateValid ? (
              availability.isFetching ? (
                <p role="status" className="flex items-center gap-2 text-xs text-fg-muted"><SpinnerIcon size={14} className="animate-spin" />Checking availability...</p>
              ) : availability.isError ? (
                <p role="alert" className="text-xs text-danger">Could not check availability.</p>
              ) : blocked ? (
                <ConflictBanner subject={selected ? `${selected.name} is already assigned on these dates.` : undefined} conflicts={conflicts} />
              ) : availability.data?.available ? (
                <AvailabilityBanner available subject={selected?.name ?? 'Resource'} detail="No conflicting assignments between these dates." />
              ) : null
            ) : null}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Notes</h3>
            <Label htmlFor="assign-resource-notes" className="sr-only">Notes</Label>
            <Textarea id="assign-resource-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </section>

          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={create.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !resourceId || !dateValid || blocked}>
              {create.isPending ? 'Assigning...' : 'Assign resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
