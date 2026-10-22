import { logInquiryActivitySchema } from '@tripchange/shared';
import { useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useLogInquiryActivity } from '@/features/inquiries/hooks/useInquiries';

export function LogActivityDialog({ inquiryId, trigger }: { inquiryId: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activityType, setActivityType] = useState('call');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const log = useLogInquiryActivity(inquiryId);

  function changeOpen(next: boolean) {
    if (log.isPending) return;
    if (!next) { setActivityType('call'); setDescription(''); setError(''); }
    setOpen(next);
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Log activity</DialogTitle><DialogDescription>Record a conversation or follow-up on this inquiry.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (description.trim().length < 3) { setError('Enter at least 3 characters'); return; }
        const result = logInquiryActivitySchema.safeParse({ activityType, description });
        if (!result.success) { setError(result.error.issues[0]?.message ?? 'Enter an activity description'); return; }
        log.mutate(result.data, { onSuccess: () => { setOpen(false); setDescription(''); setError(''); } });
      }} className="space-y-4">
        <FormField htmlFor="activity-type" label="Activity type"><Select id="activity-type" value={activityType} onChange={(event) => setActivityType(event.target.value)}>
          <option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="whatsapp">WhatsApp</option><option value="note">Note</option>
        </Select></FormField>
        <FormField htmlFor="activity-description" label="Description" required error={error}>
          <Textarea id="activity-description" value={description} maxLength={1000} aria-invalid={Boolean(error)} onChange={(event) => { setDescription(event.target.value); setError(''); }} />
        </FormField>
        <DialogFooter><Button type="button" variant="secondary" disabled={log.isPending} onClick={() => changeOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={log.isPending}>{log.isPending ? 'Saving...' : 'Log activity'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
