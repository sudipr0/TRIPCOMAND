import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePublishItinerary } from '@/features/trips/hooks/useTrips';

export function PublishItineraryDialog({ tripId, dayCount, nextVersion, open, onOpenChange }: {
  tripId: string;
  dayCount: number;
  nextVersion: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const publish = usePublishItinerary(tripId);
  const [changeNotes, setChangeNotes] = useState('');
  const [error, setError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dayCount) { setError('Add at least one day before publishing'); return; }
    setError('');
    publish.mutate({ changeNotes: changeNotes.trim() || null }, {
      onSuccess: () => { setChangeNotes(''); onOpenChange(false); },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!publish.isPending) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish itinerary?</DialogTitle>
          <DialogDescription>
            This creates version v{nextVersion}. The currently published version will be archived.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          <p className="rounded-md bg-bg-subtle px-3 py-2 text-xs text-fg-muted">
            {dayCount} {dayCount === 1 ? 'day' : 'days'} will be published. Publishing locks editing in this phase.
          </p>
          <div className="space-y-2">
            <Label htmlFor="publish-notes">Change notes</Label>
            <Textarea id="publish-notes" maxLength={500} placeholder="What changed in this version?"
              value={changeNotes} onChange={(event) => setChangeNotes(event.target.value)} />
          </div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={publish.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={publish.isPending}>{publish.isPending ? 'Publishing...' : 'Publish'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
