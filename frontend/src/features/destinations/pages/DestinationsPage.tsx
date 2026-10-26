import { PERMISSION_CODES, type DestinationDetail, type ListDestinationsQuery } from '@trailcomand/shared';
import { useEffect, useRef, useState } from 'react';

import { AddIcon, DeleteIcon, DestinationIcon, EditIcon, MoreIcon, SearchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DestinationDialog } from '@/features/destinations/components/DestinationDialog';
import { useDeleteDestination, useDestinationList } from '@/features/destinations/hooks/useDestinations';
import { useWorkspaceStore } from '@/stores/workspace.store';

const PAGE_SIZE = 20;

interface DeleteSelection {
  id: string;
  name: string;
  request: number;
}

function DeleteDestinationDialog({ selection, onConfirm }: { selection: DeleteSelection; onConfirm: (id: string) => Promise<void> }) {
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Open only after the dropdown has finished handling its selection/close.
    const frame = window.requestAnimationFrame(() => triggerRef.current?.click());
    return () => window.cancelAnimationFrame(frame);
  }, [selection.request]);

  return <ConfirmDialog
    trigger={<button type="button" ref={triggerRef} tabIndex={-1} className="sr-only" aria-label={`Confirm deletion of ${selection.name}`} />}
    title="Delete destination?" description={`Delete ${selection.name}? It will no longer appear in the destination list.`}
    confirmLabel="Delete destination" variant="danger" onConfirm={() => onConfirm(selection.id)}
  />;
}

function DestinationTableSkeleton() {
  return (
    <TableBody>
      {Array.from({ length: 5 }, (_, row) => (
        <TableRow key={row}>
          {Array.from({ length: 6 }, (_, column) => (
            <TableCell key={column}><Skeleton className="h-5 w-24" /></TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

export function DestinationsPage() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const canCreate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.DESTINATION_CREATE));
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.DESTINATION_UPDATE));
  const canDelete = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.DESTINATION_DELETE));
  const [searchInput, setSearchInput] = useState('');
  const [regionInput, setRegionInput] = useState('');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [offset, setOffset] = useState(0);
  const [editingDestination, setEditingDestination] = useState<DestinationDetail | null>(null);
  const [deleteSelection, setDeleteSelection] = useState<DeleteSelection | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      const nextRegion = regionInput.trim();
      if (nextSearch !== search || nextRegion !== region) {
        setSearch(nextSearch);
        setRegion(nextRegion);
        setOffset(0);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, regionInput, search, region]);

  useEffect(() => {
    setOffset(0);
    setEditingDestination(null);
    setDeleteSelection(null);
  }, [workspaceId]);

  const filters: ListDestinationsQuery = {
    limit: PAGE_SIZE,
    offset,
    ...(search ? { search } : {}),
    ...(region ? { region } : {}),
  };
  const list = useDestinationList(filters);
  const remove = useDeleteDestination();

  useEffect(() => {
    if (list.data && offset > 0 && offset >= list.data.total) {
      setOffset(Math.max(0, Math.ceil(list.data.total / PAGE_SIZE) - 1) * PAGE_SIZE);
    }
  }, [list.data, offset]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">Destinations</h1>
          <p className="mt-2 text-sm text-fg-muted">Manage the places in your workspace.</p>
        </div>
        {canCreate ? <DestinationDialog trigger={<Button type="button"><AddIcon size={16} />Add destination</Button>} /> : null}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <SearchIcon size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <Input className="pl-9" aria-label="Search destinations" placeholder="Search by name" maxLength={120}
            value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
        </div>
        <Input className="min-w-52 flex-1 sm:max-w-xs" aria-label="Filter by region" placeholder="Region (exact match)" maxLength={120}
          value={regionInput} onChange={(event) => setRegionInput(event.target.value)} />
        {list.data && !list.isError ? <span className="ml-auto whitespace-nowrap text-sm text-fg-muted">{list.data.total} {list.data.total === 1 ? 'destination' : 'destinations'}</span> : null}
      </div>

      {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view destinations.</p> : list.isError ? (
        <Card className="p-6 text-sm text-fg-muted" role="alert">
          Could not load destinations. <Button type="button" variant="link" onClick={() => list.refetch()}>Try again</Button>
        </Card>
      ) : (
        <>
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Region</TableHead><TableHead>Country</TableHead>
                <TableHead>Altitude</TableHead><TableHead>Templates</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              {list.isPending ? <DestinationTableSkeleton /> : list.data?.items.length ? (
                <TableBody>
                  {list.data.items.map((destination) => (
                    <TableRow key={destination.id}>
                      <TableCell className="font-medium">{destination.name}</TableCell>
                      <TableCell className="text-fg-muted">{destination.region ?? '—'}</TableCell>
                      <TableCell>{destination.country}</TableCell>
                      <TableCell>{destination.altitude === null ? '—' : `${destination.altitude.toLocaleString()} m`}</TableCell>
                      <TableCell className="text-fg-muted" title="Template counts are not available from the destination API.">Unavailable</TableCell>
                      <TableCell><div className="flex justify-end">
                        {canUpdate || canDelete ? <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${destination.name}`}><MoreIcon size={18} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canUpdate ? <DropdownMenuItem onSelect={() => setEditingDestination(destination)}><EditIcon size={16} />Edit</DropdownMenuItem> : null}
                            {canDelete ? <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setDeleteSelection((previous) => ({
                              id: destination.id, name: destination.name, request: (previous?.request ?? 0) + 1,
                            }))}><DeleteIcon size={16} />Delete</DropdownMenuItem> : null}
                          </DropdownMenuContent>
                        </DropdownMenu> : <span className="text-fg-muted">—</span>}
                      </div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              ) : <TableBody><TableRow><TableCell colSpan={6}>
                <EmptyState icon={DestinationIcon} title={search || region ? 'No matching destinations' : 'No destinations yet'}
                  description={search || region ? 'Try another name or region.' : 'Add your first destination to get started.'}
                  action={canCreate && !search && !region ? <DestinationDialog trigger={<Button type="button">Add destination</Button>} /> : undefined} />
              </TableCell></TableRow></TableBody>}
            </Table>
          </Card>
          {list.data && list.data.total > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
              <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, list.data.total)} of {list.data.total}</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button>
                <Button type="button" size="sm" variant="secondary" disabled={offset + PAGE_SIZE >= list.data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</Button>
              </div>
            </div>
          ) : null}
        </>
      )}
      {editingDestination ? <DestinationDialog destination={editingDestination} open onOpenChange={(next) => {
        if (!next) setEditingDestination(null);
      }} /> : null}
      {deleteSelection ? <DeleteDestinationDialog key={`${deleteSelection.id}-${deleteSelection.request}`} selection={deleteSelection}
        onConfirm={async (id) => { await remove.mutateAsync(id); }} /> : null}
    </div>
  );
}
