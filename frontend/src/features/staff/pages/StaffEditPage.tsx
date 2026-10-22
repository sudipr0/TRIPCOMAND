import { PERMISSION_CODES } from '@tripchange/shared';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffForm, toUpdateStaffInput, type StaffFormValues } from '@/features/staff/components/StaffForm';
import { useStaff, useUpdateStaff } from '@/features/staff/hooks/useStaff';
import { useWorkspaceStore } from '@/stores/workspace.store';

function EditContent({ staffId }: { staffId: string }) {
  const navigate = useNavigate();
  const staff = useStaff(staffId);
  const update = useUpdateStaff(staffId);
  const submit = (values: StaffFormValues) => update.mutate(toUpdateStaffInput(values), {
    onSuccess: () => navigate(`/staff/${staffId}`),
  });

  if (staff.isPending) return <Card className="space-y-4 p-6"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40 w-full" /></Card>;
  if (staff.isError) return <p role="alert" className="text-sm text-fg-muted">Could not load this staff member. <Button variant="link" onClick={() => staff.refetch()}>Try again</Button></p>;
  return <StaffForm key={`${staff.data.workspaceId}:${staff.data.id}`} staff={staff.data} pending={update.isPending} onSubmit={submit} />;
}

export function StaffEditPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.STAFF_UPDATE));
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header><Button variant="link" asChild><Link to={staffId ? `/staff/${staffId}` : '/staff'}>Back to staff profile</Link></Button>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fg">Edit staff member</h1>
      </header>
      {!staffId ? <p role="alert">Staff member not found.</p> : !canUpdate ? <p role="alert" className="text-sm text-fg-muted">You do not have permission to edit staff.</p> : <EditContent staffId={staffId} />}
    </div>
  );
}
