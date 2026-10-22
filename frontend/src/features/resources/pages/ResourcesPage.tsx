import type { ListResourcesQuery, ResourceDetail, ResourceStatus, ResourceType } from '@tripchange/shared';
import { useState } from 'react';

import { AddIcon, EditIcon, DeleteIcon, SpinnerIcon, TruckIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ResourceFormDialog } from '@/features/resources/components/ResourceFormDialog';
import { useDeleteResource, useResources } from '@/features/resources/hooks/useResources';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { PERMISSION_CODES } from '@tripchange/shared';

const PAGE_SIZE = 20;
const typeVariants: Record<ResourceType, 'info' | 'default'> = { VEHICLE: 'info', EQUIPMENT: 'default', OTHER: 'default' };
const statusVariants: Record<ResourceStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  AVAILABLE: 'success', ASSIGNED: 'info' as never, MAINTENANCE: 'warning', INACTIVE: 'default',
};

const statusLabel = (status: ResourceStatus) => status.charAt(0) + status.slice(1).toLowerCase();

function ResourceDetails({ resource }: { resource: ResourceDetail }) {
  if (resource.type === 'VEHICLE') {
    const parts = [resource.vehicleType, resource.capacity ? `${resource.capacity} seats` : null, resource.licensePlate].filter(Boolean);
    return <span className="text-sm tabular-nums text-fg-muted">{parts.length ? parts.join(' · ') : '—'}</span>;
  }
  if (resource.type === 'EQUIPMENT') {
    return <span className="text-sm tabular-nums text-fg-muted">Qty: {resource.quantity ?? '—'}</span>;
  }
  return <span className="text-sm text-fg-subtle">—</span>;
}

export function ResourcesPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | ResourceType>('');
  const [status, setStatus] = useState<'' | ResourceStatus>('');
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceDetail | undefined>(undefined);
  const [deleting, setDeleting] = useState<ResourceDetail | null>(null);
  const canCreate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.RESOURCE_CREATE));
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.RESOURCE_UPDATE));
  const remove = useDeleteResource();

  const filters: ListResourcesQuery = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
  };
  const resources = useResources(filters);
  const total = resources.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function openCreate() { setEditing(undefined); setFormOpen(true); }
  function openEdit(resource: ResourceDetail) { setEditing(resource); setFormOpen(true); }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Resources</h1>
          <p className="mt-1 text-sm text-fg-muted">Vehicles and equipment for your trips</p>
        </div>
        {canCreate ? <Button type="button" onClick={openCreate}><AddIcon size={16} />Add resource</Button> : null}
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="resource-search" className="mb-1 block text-xs font-medium text-fg-muted">Search</label>
          <Input id="resource-search" placeholder="Name, code or license plate" value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
        </div>
        <div className="w-40">
          <label htmlFor="resource-filter-type" className="mb-1 block text-xs font-medium text-fg-muted">Type</label>
          <Select id="resource-filter-type" value={type} onChange={(event) => { setType(event.target.value as '' | ResourceType); setPage(0); }}>
            <option value="">All types</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div className="w-40">
          <label htmlFor="resource-filter-status" className="mb-1 block text-xs font-medium text-fg-muted">Status</label>
          <Select id="resource-filter-status" value={status} onChange={(event) => { setStatus(event.target.value as '' | ResourceStatus); setPage(0); }}>
            <option value="">All statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>
        <span className="ml-auto pb-2 text-xs text-fg-subtle">{total} {total === 1 ? 'resource' : 'resources'}</span>
      </div>

      {resources.isPending ? (
        <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-fg-muted">
          <SpinnerIcon size={22} className="animate-spin" /><span>Loading resources...</span>
        </div>
      ) : resources.isError ? (
        <Card role="alert" className="p-6 text-sm text-fg-muted">
          Could not load resources. <Button type="button" variant="link" onClick={() => resources.refetch()}>Try again</Button>
        </Card>
      ) : !resources.data.items.length ? (
        <EmptyState icon={TruckIcon} title="No resources yet"
          description="Add vehicles or equipment to assign to trips."
          action={canCreate ? <Button type="button" onClick={openCreate}>Add resource</Button> : undefined} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                {canUpdate ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.data.items.map((resource) => (
                <TableRow key={resource.id} className="cursor-pointer" onClick={() => canUpdate && openEdit(resource)}>
                  <TableCell>
                    <p className="text-sm font-medium text-fg">{resource.name}</p>
                    {resource.code ? <p className="text-xs text-fg-muted">{resource.code}</p> : null}
                  </TableCell>
                  <TableCell><Badge variant={typeVariants[resource.type as ResourceType]}>{resource.type.charAt(0) + resource.type.slice(1).toLowerCase()}</Badge></TableCell>
                  <TableCell><ResourceDetails resource={resource} /></TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[resource.status as ResourceStatus] ?? 'default'}>{statusLabel(resource.status as ResourceStatus)}</Badge>
                  </TableCell>
                  {canUpdate ? (
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${resource.name}`}><EditIcon size={16} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEdit(resource)}><EditIcon size={16} />Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setDeleting(resource)}>
                            <DeleteIcon size={16} />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {resources.data && total > PAGE_SIZE ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-fg-subtle">
            Showing {page * PAGE_SIZE + 1}&ndash;{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
          </span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <Button type="button" size="sm" variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      ) : null}

      {formOpen ? <ResourceFormDialog key={editing?.id ?? 'new'} resource={editing} open onOpenChange={setFormOpen} /> : null}

      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(next) => { if (!next) setDeleting(null); }}
        title="Delete this resource?" description={deleting ? `Delete ${deleting.name}? Existing trip assignments are kept.` : ''}
        confirmLabel="Delete resource" variant="danger"
        onConfirm={async () => { if (deleting) await remove.mutateAsync(deleting.id); setDeleting(null); }} />
    </div>
  );
}
