import type { StaffProfileDetail } from '@tripchange/shared';
import { useState, type ReactNode } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StaffForm, toCreateStaffInput, toUpdateStaffInput, type StaffFormValues } from '@/features/staff/components/StaffForm';
import { useCreateStaff, useUpdateStaff } from '@/features/staff/hooks/useStaff';
import { useWorkspaceStore } from '@/stores/workspace.store';

interface StaffFormDialogProps {
  trigger?: ReactNode;
  staff?: StaffProfileDetail;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StaffFormDialog({ trigger, staff, open: controlledOpen, onOpenChange }: StaffFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const create = useCreateStaff();
  const update = useUpdateStaff(staff?.id ?? '');
  const open = controlledOpen ?? internalOpen;
  const pending = create.isPending || update.isPending;
  const setOpen = (next: boolean, afterSave = false) => {
    if (pending && !afterSave) return;
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const submit = (values: StaffFormValues) => {
    if (staff) {
      update.mutate(toUpdateStaffInput(values), { onSuccess: () => setOpen(false, true) });
    } else {
      create.mutate(toCreateStaffInput(values), { onSuccess: () => setOpen(false, true) });
    }
  };

  return <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
    {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
    <DialogContent className="max-h-[90vh] max-w-[760px] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{staff ? `Edit ${staff.fullName}` : 'Add staff member'}</DialogTitle>
        <DialogDescription>{staff ? 'Update the staff profile and save your changes.' : 'Create a profile for a member of your team.'}</DialogDescription>
      </DialogHeader>
      <StaffForm key={`${workspaceId}:${staff?.id ?? 'new'}:${open}`} staff={staff} pending={pending} onSubmit={submit} onCancel={() => setOpen(false)} />
    </DialogContent>
  </Dialog>;
}
