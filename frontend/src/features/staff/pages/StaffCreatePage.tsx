import { PERMISSION_CODES } from '@trailcomand/shared';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { StaffForm, toCreateStaffInput, type StaffFormValues } from '@/features/staff/components/StaffForm';
import { useCreateStaff } from '@/features/staff/hooks/useStaff';
import { useWorkspaceStore } from '@/stores/workspace.store';

export function StaffCreatePage() {
  const navigate = useNavigate();
  const canCreate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.STAFF_CREATE));
  const create = useCreateStaff();
  const submit = (values: StaffFormValues) => create.mutate(toCreateStaffInput(values), {
    onSuccess: (staff) => navigate(`/staff/${staff.id}`),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header><Button variant="link" asChild><Link to="/staff">Back to staff</Link></Button>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fg">Add staff member</h1>
        <p className="mt-2 text-sm text-fg-muted">Create a profile for a member of your team.</p>
      </header>
      {canCreate ? <StaffForm pending={create.isPending} onSubmit={submit} /> : <p role="alert" className="text-sm text-fg-muted">You do not have permission to add staff.</p>}
    </div>
  );
}
