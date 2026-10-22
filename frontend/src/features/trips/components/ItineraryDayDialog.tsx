import { useState } from 'react';
import type { ItineraryDayDetail } from '@tripchange/shared';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { TagInput } from '@/features/quotations/components/TagInput';
import { useCreateDay, useUpdateDay } from '@/features/trips/hooks/useTrips';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const numberOrNull = (value: string, integer = false) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return integer ? Math.trunc(parsed) : parsed;
};
const orNull = (value: string) => (value.trim() ? value.trim() : null);

export function ItineraryDayDialog({ tripId, day, defaultDayNumber, open, onOpenChange }: {
  tripId: string;
  day?: ItineraryDayDetail;
  defaultDayNumber?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = Boolean(day);
  const create = useCreateDay(tripId);
  const update = useUpdateDay(tripId);
  const pending = create.isPending || update.isPending;

  const [dayNumber, setDayNumber] = useState(String(day?.dayNumber ?? defaultDayNumber ?? 1));
  const [title, setTitle] = useState(day?.title ?? '');
  const [description, setDescription] = useState(day?.description ?? '');
  const [location, setLocation] = useState(day?.location ?? '');
  const [altitude, setAltitude] = useState(day?.altitude?.toString() ?? '');
  const [walkingHours, setWalkingHours] = useState(day?.walkingHours ?? '');
  const [startTime, setStartTime] = useState(day?.startTime ?? '');
  const [endTime, setEndTime] = useState(day?.endTime ?? '');
  const [accommodation, setAccommodation] = useState(day?.accommodation ?? '');
  const [meals, setMeals] = useState<string[]>(day?.meals ?? []);
  const [activities, setActivities] = useState<string[]>(day?.activities ?? []);
  const [clientVisible, setClientVisible] = useState(day?.clientVisible ?? true);
  const [internalNotes, setInternalNotes] = useState(day?.internalNotes ?? '');
  const [error, setError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const number = Number(dayNumber);
    if (!Number.isInteger(number) || number < 1) { setError('Day number must be at least 1'); return; }
    if (!title.trim()) { setError('Title is required'); return; }
    setError('');
    const payload = {
      dayNumber: number,
      title: title.trim(),
      description: orNull(description),
      location: orNull(location),
      altitude: numberOrNull(altitude, true),
      walkingHours: numberOrNull(walkingHours),
      startTime: orNull(startTime),
      endTime: orNull(endTime),
      accommodation: orNull(accommodation),
      meals,
      activities,
      clientVisible,
      internalNotes: orNull(internalNotes),
    };
    const done = { onSuccess: () => onOpenChange(false) };
    if (day) update.mutate({ dayId: day.id, input: payload }, done);
    else create.mutate(payload, done);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit day ${day?.dayNumber}` : 'Add itinerary day'}</DialogTitle>
          <DialogDescription>Days are ordered by day number, so renumbering a day moves it in the itinerary.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[110px_minmax(0,1fr)]">
            <FormField htmlFor="day-number" label="Day" required>
              <Input id="day-number" type="number" min={1} className="tabular-nums" value={dayNumber} onChange={(event) => setDayNumber(event.target.value)} />
            </FormField>
            <FormField htmlFor="day-title" label="Title" required>
              <Input id="day-title" maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
            </FormField>
          </div>
          <div className="space-y-2">
            <Label htmlFor="day-description">Description</Label>
            <Textarea id="day-description" maxLength={3000} value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="day-location" label="Location">
              <Input id="day-location" maxLength={200} value={location} onChange={(event) => setLocation(event.target.value)} />
            </FormField>
            <FormField htmlFor="day-accommodation" label="Accommodation">
              <Input id="day-accommodation" maxLength={200} value={accommodation} onChange={(event) => setAccommodation(event.target.value)} />
            </FormField>
            <FormField htmlFor="day-altitude" label="Altitude (m)">
              <Input id="day-altitude" type="number" min={0} max={10000} className="tabular-nums" value={altitude} onChange={(event) => setAltitude(event.target.value)} />
            </FormField>
            <FormField htmlFor="day-walking" label="Walking hours">
              <Input id="day-walking" type="number" min={0} max={24} step={0.5} className="tabular-nums" value={walkingHours} onChange={(event) => setWalkingHours(event.target.value)} />
            </FormField>
            <FormField htmlFor="day-start-time" label="Start time">
              <Input id="day-start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </FormField>
            <FormField htmlFor="day-end-time" label="End time">
              <Input id="day-end-time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Meals</Label>
              <TagInput value={meals} onChange={setMeals} placeholder="Breakfast, lunch, dinner" ariaLabel="Meals" maxLength={40} />
            </div>
            <div className="space-y-2">
              <Label>Activities</Label>
              <TagInput value={activities} onChange={setActivities} placeholder="Acclimatisation hike" ariaLabel="Activities" maxLength={120} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium text-fg">Visible to customer</p>
              <p className="text-xs text-fg-muted">Hidden days stay internal to operations.</p>
            </div>
            <Switch aria-label="Visible to customer" checked={clientVisible} onCheckedChange={setClientVisible} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="day-internal-notes">Internal notes</Label>
            <Textarea id="day-internal-notes" maxLength={2000} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
          </div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : editing ? 'Save changes' : 'Add day'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
