import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WarningIcon } from '@/components/icons';

export function ConfirmAssignmentDialog({ open, onOpenChange, name, roleLabel, onConfirm, pending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  roleLabel: string;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm this assignment?</DialogTitle>
          <DialogDescription>
            {name} will be confirmed as {roleLabel} for this trip. Confirming locks the assignment.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={pending} onClick={onConfirm}>{pending ? 'Confirming...' : 'Confirm'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CancelAssignmentDialog({ open, onOpenChange, name, isLeadGuide, onConfirm, pending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isLeadGuide: boolean;
  onConfirm: (reason: string) => void;
  pending: boolean;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 3) { setError('Give a short reason for cancelling'); return; }
    setError('');
    onConfirm(reason.trim());
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) { if (!next) { setReason(''); setError(''); } onOpenChange(next); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this assignment?</DialogTitle>
          <DialogDescription>{name}&rsquo;s assignment will be cancelled and stays in the history.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          {isLeadGuide ? (
            <p className="flex items-start gap-2 rounded-md border border-warning bg-bg-subtle px-3 py-2 text-xs text-fg-muted">
              <WarningIcon size={14} className="mt-0.5 shrink-0 text-warning" />
              This is the lead guide. The trip&rsquo;s lead guide will be unassigned.
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="assignment-cancel-reason">Reason</Label>
            <Textarea id="assignment-cancel-reason" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
          </div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>Keep assignment</Button>
            <Button type="submit" variant="danger" disabled={pending}>{pending ? 'Cancelling...' : 'Cancel assignment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
