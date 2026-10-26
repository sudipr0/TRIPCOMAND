import { useEffect, useState } from 'react';
import type { DisruptionCategory, DisruptionSeverity } from '@trailcomand/shared';
import type { TripDetail } from '@trailcomand/shared';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTrips } from '@/features/trips/hooks/useTrips';
import { useCreateDisruption } from '@/features/disruptions/useDisruptions';

const categories: { value: DisruptionCategory; label: string }[] = [
  { value: 'WEATHER', label: 'Weather' },
  { value: 'ROUTE_CLOSURE', label: 'Route closure' },
  { value: 'SUPPLIER_CANCELLATION', label: 'Supplier cancellation' },
  { value: 'TRANSPORT_DELAY', label: 'Transport delay' },
  { value: 'STAFF_UNAVAILABLE', label: 'Staff unavailable' },
  { value: 'EQUIPMENT_ISSUE', label: 'Equipment issue' },
  { value: 'TRAVELER_ISSUE', label: 'Traveler issue' },
  { value: 'OTHER', label: 'Other' },
];

const severities: DisruptionSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export interface ReportDisruptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId?: string;
  onCreated?: (id: string) => void;
}

export function ReportDisruptionDialog({ open, onOpenChange, tripId, onCreated }: ReportDisruptionDialogProps) {
  const trips = useTrips({ limit: 100, offset: 0 });
  const create = useCreateDisruption();
  const [selectedTripId, setSelectedTripId] = useState(tripId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DisruptionCategory>('SUPPLIER_CANCELLATION');
  const [severity, setSeverity] = useState<DisruptionSeverity>('HIGH');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedTripId(tripId ?? '');
      setTitle('');
      setDescription('');
      setCategory('SUPPLIER_CANCELLATION');
      setSeverity('HIGH');
      setError('');
    }
  }, [open, tripId]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedTripId) { setError('Select a trip'); return; }
    if (title.trim().length < 3) { setError('Enter a clear disruption title'); return; }
    if (description.trim().length < 3) { setError('Describe what happened'); return; }
    setError('');
    create.mutate({
      tripId: selectedTripId,
      title: title.trim(),
      description: description.trim(),
      category,
      severity,
    }, {
      onSuccess: (disruption) => {
        onOpenChange(false);
        onCreated?.(disruption.id);
      },
    });
  }

  const availableTrips = (trips.data?.items ?? []) as TripDetail[];

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!create.isPending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report disruption</DialogTitle>
          <DialogDescription>Record the operational event. Impact analysis will run deterministically from the trip graph.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="disruption-trip" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">Trip</label>
            {tripId ? <Input id="disruption-trip" value={availableTrips.find((tripItem) => tripItem.id === tripId)?.name ?? tripId} disabled /> : (
              <Select id="disruption-trip" value={selectedTripId} onChange={(event) => setSelectedTripId(event.target.value)} disabled={trips.isPending}>
                <option value="">Select a trip</option>
                {availableTrips.map((tripItem) => <option key={tripItem.id} value={tripItem.id}>{tripItem.tripNumber} · {tripItem.name}</option>)}
              </Select>
            )}
          </div>
          <div>
            <label htmlFor="disruption-title" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">Title</label>
            <Input id="disruption-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Lodge cancelled before arrival" maxLength={200} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="disruption-category" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">Category</label>
              <Select id="disruption-category" value={category} onChange={(event) => setCategory(event.target.value as DisruptionCategory)}>
                {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </div>
            <div>
              <label htmlFor="disruption-severity" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">Severity</label>
              <Select id="disruption-severity" value={severity} onChange={(event) => setSeverity(event.target.value as DisruptionSeverity)}>
                {severities.map((option) => <option key={option} value={option}>{option}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <label htmlFor="disruption-description" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">Description</label>
            <Textarea id="disruption-description" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What happened, and when?" maxLength={5000} />
          </div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={create.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Reporting...' : 'Report disruption'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
