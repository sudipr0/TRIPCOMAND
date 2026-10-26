import type { CreateTripTravelerInput } from '@trailcomand/shared';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBulkAddTravelers } from '@/features/trips/hooks/useTrips';

interface ParsedRow {
  line: number;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  error?: string;
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** One traveler per line: Full Name, Email, Phone, Nationality. */
export function parseTravelerLines(text: string): ParsedRow[] {
  return text.split('\n')
    .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
    .filter(({ raw }) => raw.length > 0)
    .map(({ raw, line }) => {
      const [name = '', email = '', phone = '', nationality = ''] = raw.split(',').map((part) => part.trim());
      let error: string | undefined;
      if (!name) error = 'Name is required';
      else if (email && !EMAIL.test(email)) error = 'Invalid email';
      return { line, name, email, phone, nationality, error };
    });
}

export function BulkAddTravelersDialog({ tripId, open, onOpenChange }: {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const bulk = useBulkAddTravelers(tripId);
  const [text, setText] = useState('');
  const rows = useMemo(() => parseTravelerLines(text), [text]);
  const valid = rows.filter((row) => !row.error);
  const invalid = rows.filter((row) => row.error);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid.length) { toast.error('No valid travelers to add'); return; }
    const items: CreateTripTravelerInput[] = valid.map((row) => ({
      fullName: row.name,
      email: row.email || null,
      phone: row.phone || null,
      nationality: row.nationality || null,
      isTripLeader: false,
    }));
    bulk.mutate({ items }, {
      onSuccess: () => {
        if (invalid.length) toast.warning(`${valid.length} added. ${invalid.length} skipped due to errors.`);
        else toast.success(`${valid.length} ${valid.length === 1 ? 'traveler' : 'travelers'} added`);
        setText('');
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!bulk.isPending) onOpenChange(next); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk add travelers</DialogTitle>
          <DialogDescription>
            Paste one traveler per line, comma-separated. Format: Full Name, Email, Phone, Nationality
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="bulk-travelers">Traveler data</Label>
            <Textarea id="bulk-travelers" rows={10} className="font-mono text-xs"
              placeholder={'Jane Doe, jane@example.com, +9779811111111, USA\nBob Smith, bob@example.com, , UK'}
              value={text} onChange={(event) => setText(event.target.value)} />
          </div>
          <div aria-live="polite" className="space-y-1 text-xs">
            <p className="text-fg-muted">
              {rows.length} {rows.length === 1 ? 'line' : 'lines'} detected &middot; {valid.length} ready
              {invalid.length ? ` · ${invalid.length} with errors` : ''}
            </p>
            {invalid.length ? (
              <ul className="space-y-0.5 text-danger">
                {invalid.map((row) => <li key={row.line}>Line {row.line}: {row.error}</li>)}
              </ul>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={bulk.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={bulk.isPending || !valid.length}>{bulk.isPending ? 'Adding...' : `Add ${valid.length || ''} ${valid.length === 1 ? 'traveler' : 'travelers'}`.trim()}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
