import { useEffect, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { FormField } from '@/features/auth/components/FormField';
import { useInquiryMembers, useUpdateInquiry } from '@/features/inquiries/hooks/useInquiries';

interface AssignInquiryDialogProps {
  inquiryId: string;
  assignedToId: string | null;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AssignInquiryDialog({ inquiryId, assignedToId, trigger, open: controlledOpen, onOpenChange }: AssignInquiryDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [selectedId, setSelectedId] = useState(assignedToId ?? '');
  const members = useInquiryMembers();
  const update = useUpdateInquiry(inquiryId);
  const activeMembers = members.data?.filter((member) => member.status === 'ACTIVE' && member.user.status === 'ACTIVE') ?? [];
  useEffect(() => { if (!open) setSelectedId(assignedToId ?? ''); }, [open, assignedToId]);

  function setOpen(next: boolean) {
    if (update.isPending) return;
    if (next) setSelectedId(assignedToId ?? '');
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
    <DialogContent>
      <DialogHeader><DialogTitle>Assign inquiry</DialogTitle><DialogDescription>Choose an active workspace member, or leave this inquiry unassigned.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => {
        event.preventDefault();
        if (selectedId === (assignedToId ?? '')) { setOpen(false); return; }
        update.mutate({ assignedToId: selectedId || null }, { onSuccess: () => {
          if (onOpenChange) onOpenChange(false);
          else setInternalOpen(false);
        } });
      }} className="space-y-4">
        <FormField htmlFor="assign-inquiry-member" label="Assigned to">
          <Select id="assign-inquiry-member" value={selectedId} disabled={members.isPending || members.isError || update.isPending}
            onChange={(event) => setSelectedId(event.target.value)}>
            <option value="">Unassigned</option>
            {assignedToId && !activeMembers.some((member) => member.userId === assignedToId) ? <option value={assignedToId} disabled>Previously assigned member (inactive or unavailable)</option> : null}
            {activeMembers.map((member) =>
              <option key={member.userId} value={member.userId}>{member.user.firstName} {member.user.lastName}</option>)}
          </Select>
        </FormField>
        {members.isError ? <p role="alert" className="text-sm text-fg-muted">Could not load members. <Button type="button" variant="link" onClick={() => members.refetch()}>Try again</Button></p> : null}
        <DialogFooter><Button type="button" variant="secondary" disabled={update.isPending} onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={update.isPending || members.isPending || members.isError || (selectedId !== '' && !activeMembers.some((member) => member.userId === selectedId))}>
            {update.isPending ? 'Saving...' : 'Save assignment'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
