import type { ListSuppliersQuery, SupplierDetail } from '@tripchange/shared';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AddIcon, EditIcon, DeleteIcon, SpinnerIcon, StarIcon, SupplierIcon, WarningIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeadlineBadge } from '@/features/suppliers/components/DeadlineBadge';
import { SupplierCategoryBadge, SupplierStatusBadge } from '@/features/suppliers/components/SupplierBadges';
import { SupplierFormDialog } from '@/features/suppliers/components/SupplierFormDialog';
import { useDeleteSupplier, useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import { useSupplierDeadlines } from '@/features/suppliers/hooks/useSupplierBookings';
import { formatDate } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { PERMISSION_CODES } from '@tripchange/shared';

const PAGE_SIZE = 20;

export function RatingStars({ rating }: { rating: number | null | undefined }) {
  if (!rating) return <span className="text-sm text-fg-subtle">&mdash;</span>;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <StarIcon key={value} size={14} weight={value <= rating ? 'fill' : 'regular'}
          className={value <= rating ? 'text-warning' : 'text-fg-subtle'} aria-hidden="true" />
      ))}
    </span>
  );
}

function DeadlineWidget() {
  const deadlines = useSupplierDeadlines(168);
  const items = deadlines.data ?? [];
  if (deadlines.isPending || !items.length) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Upcoming cancellation deadlines</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {items.slice(0, 5).map((booking) => (
          <Link key={booking.id} to={booking.tripId ? `/trips/${booking.tripId}?tab=suppliers` : '/suppliers'}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md px-1 py-2 transition-colors duration-fast hover:bg-bg-muted">
            <span className="flex min-w-0 items-center gap-2">
              <WarningIcon size={14} className="shrink-0 text-warning" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-sm text-fg">{booking.supplier?.name ?? 'Supplier'}</span>
                <span className="block truncate text-xs text-fg-muted">
                  {booking.description}{booking.trip ? ` · ${booking.trip.name}` : ''}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-fg-subtle">{booking.cancellationDeadline ? formatDate(booking.cancellationDeadline) : ''}</span>
              <DeadlineBadge deadline={booking.cancellationDeadline} />
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export function SuppliersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierDetail | undefined>(undefined);
  const [deleting, setDeleting] = useState<SupplierDetail | null>(null);
  const canCreate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.SUPPLIER_CREATE));
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.SUPPLIER_UPDATE));
  const remove = useDeleteSupplier();

  const filters: ListSuppliersQuery = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(category ? { category: category as never } : {}),
    ...(region.trim() ? { region: region.trim() } : {}),
    ...(status ? { status: status as never } : {}),
  };
  const suppliers = useSuppliers(filters);
  const total = suppliers.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function openCreate() { setEditing(undefined); setFormOpen(true); }
  function openEdit(supplier: SupplierDetail) { setEditing(supplier); setFormOpen(true); }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Suppliers</h1>
          <p className="mt-1 text-sm text-fg-muted">Lodges, transport, permits, and service providers</p>
        </div>
        {canCreate ? <Button type="button" onClick={openCreate}><AddIcon size={16} />Add supplier</Button> : null}
      </header>

      <DeadlineWidget />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="supplier-search" className="mb-1 block text-xs font-medium text-fg-muted">Search</label>
          <Input id="supplier-search" placeholder="Name, code or contact" value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
        </div>
        <div className="w-40">
          <label htmlFor="supplier-filter-category" className="mb-1 block text-xs font-medium text-fg-muted">Category</label>
          <Select id="supplier-filter-category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }}>
            <option value="">All categories</option>
            <option value="ACCOMMODATION">Accommodation</option>
            <option value="TRANSPORT">Transport</option>
            <option value="FOOD">Food</option>
            <option value="PERMIT">Permit</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="INSURANCE">Insurance</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div className="w-36">
          <label htmlFor="supplier-filter-region" className="mb-1 block text-xs font-medium text-fg-muted">Region</label>
          <Input id="supplier-filter-region" placeholder="e.g. Khumbu" value={region}
            onChange={(event) => { setRegion(event.target.value); setPage(0); }} />
        </div>
        <div className="w-40">
          <label htmlFor="supplier-filter-status" className="mb-1 block text-xs font-medium text-fg-muted">Status</label>
          <Select id="supplier-filter-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLACKLISTED">Blacklisted</option>
            <option value="PENDING_REVIEW">Pending review</option>
          </Select>
        </div>
        <span className="ml-auto pb-2 text-xs text-fg-subtle">{total} {total === 1 ? 'supplier' : 'suppliers'}</span>
      </div>

      {suppliers.isPending ? (
        <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-fg-muted">
          <SpinnerIcon size={22} className="animate-spin" /><span>Loading suppliers...</span>
        </div>
      ) : suppliers.isError ? (
        <Card role="alert" className="p-6 text-sm text-fg-muted">
          Could not load suppliers. <Button type="button" variant="link" onClick={() => suppliers.refetch()}>Try again</Button>
        </Card>
      ) : !suppliers.data.items.length ? (
        <EmptyState icon={SupplierIcon} title="No suppliers yet"
          description="Add lodges, transport providers, and other service suppliers."
          action={canCreate ? <Button type="button" onClick={openCreate}>Add supplier</Button> : undefined} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Region</TableHead>
                <TableHead>Contact</TableHead><TableHead>Rating</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.data.items.map((supplier) => (
                <TableRow key={supplier.id} className="cursor-pointer" onClick={() => navigate(`/suppliers/${supplier.id}`)}>
                  <TableCell>
                    <p className="text-sm font-medium text-fg">{supplier.name}</p>
                    {supplier.code ? <p className="text-xs text-fg-muted">{supplier.code}</p> : null}
                  </TableCell>
                  <TableCell><SupplierCategoryBadge category={supplier.category} /></TableCell>
                  <TableCell className="text-sm text-fg-muted">{supplier.region ?? '—'}</TableCell>
                  <TableCell>
                    <p className="text-sm text-fg">{supplier.contactName ?? '—'}</p>
                    <p className="text-xs tabular-nums text-fg-muted">{supplier.phone ?? ''}</p>
                  </TableCell>
                  <TableCell><RatingStars rating={supplier.rating} /></TableCell>
                  <TableCell><SupplierStatusBadge status={supplier.status} /></TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${supplier.name}`}><EditIcon size={16} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to={`/suppliers/${supplier.id}`}>View</Link></DropdownMenuItem>
                        {canUpdate ? <DropdownMenuItem onSelect={() => openEdit(supplier)}><EditIcon size={16} />Edit</DropdownMenuItem> : null}
                        {canUpdate ? <><DropdownMenuSeparator />
                          <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setDeleting(supplier)}>
                            <DeleteIcon size={16} />Delete
                          </DropdownMenuItem></> : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {suppliers.data && total > PAGE_SIZE ? (
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

      {formOpen ? <SupplierFormDialog key={editing?.id ?? 'new'} supplier={editing} open onOpenChange={setFormOpen} /> : null}

      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(next) => { if (!next) setDeleting(null); }}
        title="Delete this supplier?" description={deleting ? `Delete ${deleting.name}? Existing bookings keep their history.` : ''}
        confirmLabel="Delete supplier" variant="danger"
        onConfirm={async () => { if (deleting) await remove.mutateAsync(deleting.id); setDeleting(null); }} />
    </div>
  );
}
