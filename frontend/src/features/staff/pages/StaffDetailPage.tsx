import { PERMISSION_CODES, STAFF_STATUSES, type StaffProfileDetail, type StaffStatus } from '@tripchange/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { SpinnerIcon } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StaffDocuments } from '@/features/staff/components/StaffDocuments';
import { StaffFormDialog } from '@/features/staff/components/StaffFormDialog';
import { StaffLicenseExpiry } from '@/features/staff/components/StaffLicenseExpiry';
import { StaffStatusBadge, staffStatusLabel, staffTypeLabel } from '@/features/staff/components/StaffStatusBadge';
import { useDeleteStaff, useStaff, useUpdateStaff } from '@/features/staff/hooks/useStaff';
import { getInitials } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-fg">{value || '—'}</dd></div>;
}

function Chips({ items }: { items: string[] }) {
  return items.length ? <div className="flex flex-wrap gap-1">{items.map((item) => <Badge key={item}>{item}</Badge>)}</div> : '—';
}

function StaffProfile({ staff }: { staff: StaffProfileDetail }) {
  return <div className="space-y-5">
    <Card>
      <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
      <CardContent><dl className="grid gap-5 sm:grid-cols-2">
        <Detail label="Email" value={staff.email} />
        <Detail label="Phone" value={staff.phone} />
        <Detail label="WhatsApp" value={staff.whatsapp} />
        <Detail label="Photo URL" value={staff.photoUrl} />
      </dl></CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Professional</CardTitle></CardHeader>
      <CardContent><dl className="grid gap-5 sm:grid-cols-2">
        <Detail label="License number" value={staff.licenseNumber} />
        <Detail label="License expiry" value={<StaffLicenseExpiry expiresAt={staff.licenseExpiry} />} />
        <Detail label="Experience" value={staff.experienceYears === null ? null : `${staff.experienceYears} years`} />
        <Detail label="Experience level" value={staff.experienceLevel} />
         <Detail label="Languages" value={<Chips items={staff.languages} />} />
         <Detail label="Certifications" value={<Chips items={staff.certifications} />} />
         <Detail label="Preferred routes" value={<Chips items={staff.preferredRoutes} />} />
      </dl></CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Emergency</CardTitle></CardHeader>
      <CardContent><dl className="grid gap-5 sm:grid-cols-2">
        <Detail label="Contact name" value={staff.emergencyContactName} />
        <Detail label="Contact phone" value={staff.emergencyContactPhone} />
      </dl></CardContent>
    </Card>
  </div>;
}

function StaffSidebar({ staff, canUpdate }: { staff: StaffProfileDetail; canUpdate: boolean }) {
  const [notes, setNotes] = useState(staff.notes ?? '');
  const [status, setStatus] = useState(staff.status);
  const update = useUpdateStaff(staff.id);
  useEffect(() => { setNotes(staff.notes ?? ''); }, [staff.notes]);
  useEffect(() => { setStatus(staff.status); }, [staff.status]);

  const saveNotes = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (notes.trim() !== (staff.notes ?? '')) update.mutate({ notes: notes.trim() || null });
  };

  return <aside className="space-y-5">
    <Card>
      <CardHeader><CardTitle>Status</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <StaffStatusBadge status={staff.status} />
        <div className="space-y-2">
          <Label htmlFor="staff-detail-status">Availability</Label>
           <Select id="staff-detail-status" value={status} disabled={!canUpdate || update.isPending}
             onChange={(event) => setStatus(event.target.value)}>
             {STAFF_STATUSES.map((status) => <option key={status} value={status}>{staffStatusLabel(status)}</option>)}
           </Select>
           {canUpdate ? <Button type="button" size="sm" disabled={update.isPending || status === staff.status}
             onClick={() => update.mutate({ status: status as StaffStatus })}>{update.isPending ? 'Updating...' : 'Update status'}</Button> : null}
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
      <CardContent>
        <form noValidate onSubmit={saveNotes} className="space-y-3">
          <Label htmlFor="staff-detail-notes">Internal notes</Label>
          <Textarea id="staff-detail-notes" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!canUpdate || update.isPending} placeholder="Add notes about this staff member" />
          {canUpdate ? <Button type="submit" size="sm" disabled={update.isPending || notes.trim() === (staff.notes ?? '')}>{update.isPending ? 'Saving...' : 'Save notes'}</Button> : null}
        </form>
      </CardContent>
    </Card>
  </aside>;
}

function DetailContent({ staffId }: { staffId: string }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const staff = useStaff(staffId);
  const remove = useDeleteStaff();
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.STAFF_UPDATE));
  const canDelete = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.STAFF_DELETE));
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const scrolledToDocuments = useRef<string | null>(null);

  useEffect(() => {
    const key = `${workspaceId}:${staffId}`;
    if (staff.data && searchParams.get('tab') === 'documents' && scrolledToDocuments.current !== key) {
      document.getElementById('staff-documents')?.scrollIntoView({ block: 'start' });
      scrolledToDocuments.current = key;
    }
  }, [searchParams, staff.data, workspaceId, staffId]);

  if (staff.isPending) return <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-fg-muted"><SpinnerIcon size={22} className="animate-spin" /><span>Loading staff member...</span></div>;
  if (staff.isError) return <Card className="p-6 text-sm text-fg-muted" role="alert">Could not load this staff member. <Button type="button" variant="link" onClick={() => staff.refetch()}>Try again</Button></Card>;

  const profile = staff.data;
  return <>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="h-10 w-10">
          {profile.photoUrl && /^https?:\/\//i.test(profile.photoUrl) ? <AvatarImage src={profile.photoUrl} alt="" /> : null}
          <AvatarFallback>{getInitials(profile.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-fg">{profile.fullName}</h1>
          <Badge className="mt-1">{staffTypeLabel(profile.staffType)}</Badge>
        </div>
      </div>
      <div className="flex gap-2">
        {canUpdate ? <StaffFormDialog key={`${workspaceId}:${profile.id}`} staff={profile} trigger={<Button type="button" variant="secondary">Edit profile</Button>} /> : null}
        {canDelete ? <ConfirmDialog trigger={<Button type="button" variant="ghost" className="text-danger hover:text-danger">Delete</Button>}
          title="Delete staff member?" description={`Delete ${profile.fullName}? Their profile will no longer appear in the staff list.`}
          confirmLabel="Delete staff member" variant="danger"
          onConfirm={async () => { await remove.mutateAsync(staffId); navigate('/staff'); }} /> : null}
      </div>
    </header>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-6">
        <StaffProfile staff={profile} />
        <StaffDocuments staffId={staffId} documents={profile.documents ?? []} />
      </div>
      <StaffSidebar key={`${workspaceId}:${profile.id}`} staff={profile} canUpdate={canUpdate} />
    </div>
  </>;
}

export function StaffDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  return <div className="mx-auto max-w-6xl space-y-6">
    <Button variant="link" asChild><Link to="/staff">Back to staff</Link></Button>
    {staffId ? <DetailContent staffId={staffId} /> : <p role="alert">Staff member not found.</p>}
  </div>;
}
