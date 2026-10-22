import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useUpdateInquiry } from '@/features/inquiries/hooks/useInquiries';

export function MarkLostDialog({ inquiryId, trigger, open: controlledOpen, onOpenChange }: {
  inquiryId: string; trigger?: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const update = useUpdateInquiry(inquiryId);
  function changeOpen(next: boolean) {
    if (update.isPending) return;
    if (!next) { setReason(''); setError(''); }
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  }
  return <Dialog open={open} onOpenChange={changeOpen}>
    {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
    <DialogContent><DialogHeader><DialogTitle>Mark inquiry lost?</DialogTitle><DialogDescription>Record why this inquiry was lost.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (reason.trim().length < 5) { setError('Enter at least 5 characters'); return; }
        if (reason.trim().length > 500) { setError('Use 500 characters or fewer'); return; }
        update.mutate({ status: 'LOST', lostReason: reason.trim() }, { onSuccess: () => {
          if (onOpenChange) onOpenChange(false);
          else setInternalOpen(false);
          setReason(''); setError('');
        } });
      }}>
        <FormField htmlFor="lost-reason" label="Lost reason" required error={error}><Textarea id="lost-reason" maxLength={500} value={reason} aria-invalid={Boolean(error)} onChange={(event) => { setReason(event.target.value); setError(''); }} /></FormField>
        <DialogFooter><Button type="button" variant="secondary" disabled={update.isPending} onClick={() => changeOpen(false)}>Cancel</Button>
          <Button type="submit" variant="danger" disabled={update.isPending}>{update.isPending ? 'Saving...' : 'Mark lost'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
