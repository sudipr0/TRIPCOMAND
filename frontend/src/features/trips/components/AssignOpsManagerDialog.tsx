import { useEffect, useState } from 'react';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useAssignTrip } from '@/features/trips/hooks/useTrips';
import { useMembers } from '@/features/workspace/hooks/useMembers';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function AssignOpsManagerDialog({ tripId, currentOperationsManagerId, open, onOpenChange }: {
  tripId: string;
  currentOperationsManagerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const assign = useAssignTrip(tripId);
  const { data: members = [], isLoading } = useMembers();
  const activeMembers = members.filter((member) => member.status === 'ACTIVE');
  const [selected, setSelected] = useState(currentOperationsManagerId ?? '');

  useEffect(() => {
    setSelected(currentOperationsManagerId ?? '');
  }, [currentOperationsManagerId]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    assign.mutate({ operationsManagerId: selected || null }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!assign.isPending) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign operations manager</DialogTitle>
          <DialogDescription>The operations manager is accountable for this trip running as planned.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ops-manager">Operations manager</Label>
            {isLoading ? (
              <p className="text-sm text-fg-muted">Loading workspace members...</p>
            ) : activeMembers.length === 0 ? (
              <p className="text-sm text-fg-muted">No workspace member available to assign.</p>
            ) : (
              <Select id="ops-manager" value={selected} onChange={(event) => setSelected(event.target.value)}>
                <option value="">Unassigned</option>
                {activeMembers.map((member) => {
                  const fullName = [member.user.firstName, member.user.lastName].filter(Boolean).join(' ') || member.user.email;
                  return <option key={member.userId} value={member.userId}>{fullName} · {member.role.name}</option>;
                })}
              </Select>
            )}
            <p className="text-xs text-fg-subtle">
              The operations manager must be a workspace member. Staff assignments are managed in Phase 5.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={assign.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={assign.isPending || activeMembers.length === 0}>{assign.isPending ? 'Saving...' : 'Save assignment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
