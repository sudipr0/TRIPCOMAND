import { PERMISSION_CODES, STAFF_STATUSES, STAFF_TYPES, type ListStaffInput, type StaffProfileDetail, type StaffStatus, type StaffType } from '@tripchange/shared';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AddIcon, DeleteIcon, EditIcon, FileIcon, MoreIcon, SearchIcon, StaffIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StaffFormDialog } from '@/features/staff/components/StaffFormDialog';
import { StaffLicenseExpiry } from '@/features/staff/components/StaffLicenseExpiry';
import { StaffStatusBadge, staffStatusLabel, staffTypeLabel } from '@/features/staff/components/StaffStatusBadge';
import { useDeleteStaff, useStaffList } from '@/features/staff/hooks/useStaff';
import { useWorkspaceStore } from '@/stores/workspace.store';

const PAGE_SIZE = 20;

function StaffTableSkeleton() {
  return <TableBody>
    {Array.from({ length: 5 }, (_, row) => <TableRow key={row}>
      {Array.from({ length: 6 }, (_, column) => <TableCell key={column}><Skeleton className="h-5 w-24" /></TableCell>)}
    </TableRow>)}
  </TableBody>;
}

export function StaffListPage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const canCreate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.STAFF_CREATE));
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.STAFF_UPDATE));
  const canVerify = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.STAFF_VERIFY));
  const canDelete = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.STAFF_DELETE));
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [staffType, setStaffType] = useState<StaffType | ''>('');
  const [status, setStatus] = useState<StaffStatus | ''>('');
  const [offset, setOffset] = useState(0);
  const [editingStaff, setEditingStaff] = useState<StaffProfileDetail | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffProfileDetail | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const filters: ListStaffInput = {
    limit: PAGE_SIZE, offset,
    ...(search ? { search } : {}),
    ...(staffType ? { staffType } : {}),
    ...(status ? { status } : {}),
  };
  const list = useStaffList(filters);
  const remove = useDeleteStaff();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next !== search) { setSearch(next); setOffset(0); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);
  useEffect(() => { setOffset(0); setEditingStaff(null); setDeletingStaff(null); }, [workspaceId]);
  useEffect(() => {
    if (list.data && offset > 0 && offset >= list.data.total) setOffset(Math.max(0, Math.ceil(list.data.total / PAGE_SIZE) - 1) * PAGE_SIZE);
  }, [list.data, offset]);

  async function confirmDelete() {
    if (!deletingStaff) return;
    setDeleteError(false);
    try {
      await remove.mutateAsync(deletingStaff.id);
      setDeletingStaff(null);
    } catch {
      setDeleteError(true);
    }
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Staff</h1>
        <p className="mt-2 text-sm text-fg-muted">Manage staff profiles, qualifications and documents.</p>
      </div>
      {canCreate ? <StaffFormDialog trigger={<Button type="button"><AddIcon size={16} />Add staff member</Button>} /> : null}
    </header>
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-52 flex-1 sm:max-w-sm">
        <SearchIcon size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
        <Input className="pl-9" aria-label="Search staff" placeholder="Search name, email or phone" maxLength={120}
          value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
      </div>
      <Select aria-label="Filter by staff type" value={staffType} onChange={(event) => { setStaffType(event.target.value as StaffType | ''); setOffset(0); }}>
        <option value="">All types</option>
        {STAFF_TYPES.map((type) => <option key={type} value={type}>{staffTypeLabel(type)}</option>)}
      </Select>
      <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as StaffStatus | ''); setOffset(0); }}>
        <option value="">All statuses</option>
        {STAFF_STATUSES.map((item) => <option key={item} value={item}>{staffStatusLabel(item)}</option>)}
      </Select>
      {list.data ? <span className="ml-auto whitespace-nowrap text-sm text-fg-muted">{list.data.total} staff {list.data.total === 1 ? 'member' : 'members'}</span> : null}
    </div>
    {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view staff.</p> : list.isError ? (
      <Card className="p-6 text-sm text-fg-muted" role="alert">Could not load staff. <Button type="button" variant="link" onClick={() => list.refetch()}>Try again</Button></Card>
    ) : <>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Contact</TableHead><TableHead>License expiry</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          {list.isPending ? <StaffTableSkeleton /> : list.data?.items.length ? <TableBody>
            {list.data.items.map((staff) => <TableRow key={staff.id} className="cursor-pointer"
              tabIndex={0} aria-label={`View ${staff.fullName}`}
              onClick={() => navigate(`/staff/${staff.id}`)}
              onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); navigate(`/staff/${staff.id}`); } }}>
              <TableCell className="font-medium text-accent">{staff.fullName}</TableCell>
              <TableCell><Badge>{staffTypeLabel(staff.staffType)}</Badge></TableCell>
              <TableCell><StaffStatusBadge status={staff.status} /></TableCell>
              <TableCell className="text-fg-muted">{staff.email ?? staff.phone ?? '—'}</TableCell>
              <TableCell><StaffLicenseExpiry expiresAt={staff.licenseExpiry} /></TableCell>
              <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${staff.fullName}`}><MoreIcon size={18} /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canUpdate ? <DropdownMenuItem onSelect={() => setEditingStaff(staff)}><EditIcon size={16} />Edit</DropdownMenuItem> : null}
                      {canVerify ? <DropdownMenuItem asChild><Link to={`/staff/${staff.id}?tab=documents`}><FileIcon size={16} />Verify documents</Link></DropdownMenuItem> : null}
                      {canDelete ? <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => { setDeleteError(false); setDeletingStaff(staff); }}><DeleteIcon size={16} />Delete</DropdownMenuItem> : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>)}
          </TableBody> : <TableBody><TableRow><TableCell colSpan={6}>
            <EmptyState icon={StaffIcon} title={search || staffType || status ? 'No matching staff' : 'No staff members yet'}
              description={search || staffType || status ? 'Try another search or filter.' : 'Add your first staff member to get started.'}
              action={canCreate && !search && !staffType && !status ? <StaffFormDialog trigger={<Button type="button">Add staff member</Button>} /> : undefined} />
          </TableCell></TableRow></TableBody>}
        </Table>
      </Card>
      {list.data && list.data.total > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
        <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, list.data.total)} of {list.data.total}</span>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button>
          <Button type="button" variant="secondary" size="sm" disabled={offset + PAGE_SIZE >= list.data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</Button>
        </div>
      </div> : null}
    </>}
    {editingStaff ? <StaffFormDialog staff={editingStaff} open onOpenChange={(next) => { if (!next) setEditingStaff(null); }} /> : null}
    <Dialog open={Boolean(deletingStaff)} onOpenChange={(next) => { if (!next && !remove.isPending) setDeletingStaff(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Delete staff member?</DialogTitle>
          <DialogDescription>Delete {deletingStaff?.fullName}? Their profile will no longer appear in the staff list.</DialogDescription>
        </DialogHeader>
        {deleteError ? <p role="alert" className="text-sm text-danger">Could not delete staff member. Please try again.</p> : null}
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={remove.isPending} onClick={() => setDeletingStaff(null)}>Cancel</Button>
          <Button type="button" variant="danger" disabled={remove.isPending} onClick={confirmDelete}>{remove.isPending ? 'Deleting...' : 'Delete staff member'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
