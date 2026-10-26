import { useState } from 'react';
import type { CheckInType, CreateCheckInInput } from '@trailcomand/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CHECK_IN_LABELS, useCreateCheckIn } from '@/features/field/useField';

interface CheckInFormProps {
  tripId: string;
  /** A sensible default derived from the button the guide tapped. */
  initialType?: CheckInType;
  clientId: string;
  onDone: () => void;
  onCancel: () => void;
}

const TYPE_OPTIONS: CheckInType[] = ['START', 'MID', 'END', 'DELAY', 'ISSUE'];

export function CheckInForm({ tripId, initialType = 'START', clientId, onDone, onCancel }: CheckInFormProps) {
  const createCheckIn = useCreateCheckIn(tripId);
  const [type, setType] = useState<CheckInType>(initialType);
  const [location, setLocation] = useState('');
  const [altitude, setAltitude] = useState('');
  const [message, setMessage] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload: CreateCheckInInput = {
      checkInType: type,
      location: location.trim() || null,
      altitude: altitude.trim() ? Number(altitude) : null,
      message: message.trim() || null,
      photoUrls: [],
      recordedAt: new Date().toISOString(),
      clientId,
    };
    createCheckIn.mutate(payload, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="checkin-type" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Check-in type
        </label>
        <Select id="checkin-type" value={type} onChange={(event) => setType(event.target.value as CheckInType)} className="h-11 text-md">
          {TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>{CHECK_IN_LABELS[option]}</option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="checkin-location" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Location
        </label>
        <Input id="checkin-location" value={location} onChange={(event) => setLocation(event.target.value)}
          placeholder="e.g. Namche Bazaar" className="h-11 text-md" />
      </div>

      <div>
        <label htmlFor="checkin-altitude" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Altitude (metres)
        </label>
        <Input id="checkin-altitude" inputMode="numeric" value={altitude}
          onChange={(event) => setAltitude(event.target.value.replace(/[^0-9]/g, ''))}
          placeholder="e.g. 3440" className="h-11 text-md" />
      </div>

      <div>
        <label htmlFor="checkin-message" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Message
        </label>
        <Textarea id="checkin-message" value={message} onChange={(event) => setMessage(event.target.value)}
          placeholder="Anything the office should know" rows={3} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" size="lg" className="h-12 flex-1 text-md" disabled={createCheckIn.isPending}>
          {createCheckIn.isPending ? 'Sending...' : 'Send check-in'}
        </Button>
        <Button type="button" size="lg" variant="secondary" className="h-12" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
