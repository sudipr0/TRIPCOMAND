import { CUSTOMER_TYPES, PERMISSION_CODES, type CustomerDetail, type CustomerType, type ListCustomersQuery } from '@trailcomand/shared';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AddIcon, CustomerIcon, DeleteIcon, EditIcon, MoreIcon, SearchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog';
import { CustomerTypeBadge } from '@/features/customers/components/CustomerTypeBadge';
import { useCustomerList, useDeleteCustomer } from '@/features/customers/hooks/useCustomers';
import { useWorkspaceStore } from '@/stores/workspace.store';

const PAGE_SIZE = 20;

interface DeleteSelection { id: string; name: string; request: number }

function DeleteCustomerDialog({ selection, onConfirm }: { selection: DeleteSelection; onConfirm: (id: string) => Promise<void> }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => triggerRef.current?.click());
    return () => window.cancelAnimationFrame(frame);
  }, [selection.request]);

  return <ConfirmDialog
    trigger={<button type="button" ref={triggerRef} tabIndex={-1} className="sr-only" aria-label={`Confirm deletion of ${selection.name}`} />}
    title="Delete customer?" description={`Delete ${selection.name}? Their profile will no longer be available.`}
    confirmLabel="Delete customer" variant="danger" onConfirm={() => onConfirm(selection.id)}
  />;
}

function CustomerTableSkeleton() {
  return <TableBody>{Array.from({ length: 5 }, (_, row) => <TableRow key={row}>
    {Array.from({ length: 6 }, (_, column) => <TableCell key={column}><Skeleton className="h-5 w-24" /></TableCell>)}
  </TableRow>)}</TableBody>;
}

export function CustomersPage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const canCreate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.CUSTOMER_CREATE));
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.CUSTOMER_UPDATE));
  const canDelete = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.CUSTOMER_DELETE));
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType | ''>('');
  const [offset, setOffset] = useState(0);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDetail | null>(null);
  const [deleteSelection, setDeleteSelection] = useState<DeleteSelection | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next !== search) { setSearch(next); setOffset(0); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    setOffset(0);
    setEditingCustomer(null);
    setDeleteSelection(null);
  }, [workspaceId]);

  const filters: ListCustomersQuery = {
    limit: PAGE_SIZE, offset,
    ...(search ? { search } : {}),
    ...(customerType ? { customerType } : {}),
  };
  const list = useCustomerList(filters);
  const remove = useDeleteCustomer();

  useEffect(() => {
    if (list.data && offset > 0 && offset >= list.data.total) {
      setOffset(Math.max(0, Math.ceil(list.data.total / PAGE_SIZE) - 1) * PAGE_SIZE);
    }
  }, [list.data, offset]);

  const filtered = Boolean(search || customerType);
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight text-fg">Customers</h1>
        <p className="mt-2 text-sm text-fg-muted">Travelers and groups who book with you</p></div>
      {canCreate ? <CustomerFormDialog trigger={<Button type="button"><AddIcon size={16} />Add customer</Button>} /> : null}
    </header>

    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-52 flex-1 sm:max-w-sm">
        <SearchIcon size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
        <Input className="pl-9" aria-label="Search customers" placeholder="Search name, email or phone" maxLength={120}
          value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
      </div>
      <div className="min-w-44">
        <Select aria-label="Filter by customer type" value={customerType} onChange={(event) => {
          setCustomerType(event.target.value as CustomerType | ''); setOffset(0);
        }}>
          <option value="">All types</option>
          {CUSTOMER_TYPES.map((type) => <option key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</option>)}
        </Select>
      </div>
      {list.data && !list.isError ? <span className="ml-auto whitespace-nowrap text-sm text-fg-muted">
        {list.data.total} {list.data.total === 1 ? 'customer' : 'customers'}
      </span> : null}
    </div>

    {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view customers.</p> : list.isError ? (
      <Card className="p-6 text-sm text-fg-muted" role="alert">
        Could not load customers. <Button type="button" variant="link" onClick={() => list.refetch()}>Try again</Button>
      </Card>
    ) : <>
      <Card className="overflow-x-auto"><Table>
        <TableHeader><TableRow>
          <TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Contact</TableHead><TableHead>Phone</TableHead>
          <TableHead>Source</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        {list.isPending ? <CustomerTableSkeleton /> : list.data?.items.length ? <TableBody>
          {list.data.items.map((customer) => <TableRow key={customer.id} tabIndex={0}
            aria-label={`View ${customer.fullName}`} className="cursor-pointer focus-visible:outline-accent"
            onClick={(event) => { if (event.target instanceof Node && event.currentTarget.contains(event.target)) navigate(`/customers/${customer.id}`); }}
            onKeyDown={(event) => {
              if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                navigate(`/customers/${customer.id}`);
              }
            }}>
            <TableCell><div className="min-w-40 space-y-0.5">
              <Link to={`/customers/${customer.id}`} className="font-medium text-fg hover:underline" onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}>{customer.fullName}</Link>
              <div className="text-xs text-fg-muted">{customer.email ?? 'No email'}</div>
            </div></TableCell>
            <TableCell><CustomerTypeBadge type={customer.customerType} /></TableCell>
            <TableCell className="text-fg-muted">{customer.email ?? '—'}</TableCell>
            <TableCell className="tabular-nums">{customer.phone ?? '—'}</TableCell>
            <TableCell>{customer.source ?? '—'}</TableCell>
            <TableCell><div className="flex justify-end" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><DropdownMenu>
              <DropdownMenuTrigger asChild><Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${customer.fullName}`}><MoreIcon size={18} /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to={`/customers/${customer.id}`}>View details</Link></DropdownMenuItem>
                {canUpdate ? <DropdownMenuItem onSelect={() => setEditingCustomer(customer)}><EditIcon size={16} />Edit</DropdownMenuItem> : null}
                {canDelete ? <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setDeleteSelection((previous) => ({
                  id: customer.id, name: customer.fullName, request: (previous?.request ?? 0) + 1,
                }))}><DeleteIcon size={16} />Delete</DropdownMenuItem> : null}
              </DropdownMenuContent>
            </DropdownMenu></div></TableCell>
          </TableRow>)}
        </TableBody> : <TableBody><TableRow><TableCell colSpan={6}>
          <EmptyState icon={CustomerIcon} title={filtered ? 'No matching customers' : 'No customers yet'}
            description={filtered ? 'Try another search or type.' : 'Add your first customer to get started.'}
            action={canCreate && !filtered ? <CustomerFormDialog trigger={<Button type="button">Add customer</Button>} /> : undefined} />
        </TableCell></TableRow></TableBody>}
      </Table></Card>
      {list.data && list.data.total > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
        <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, list.data.total)} of {list.data.total}</span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button>
          <Button type="button" size="sm" variant="secondary" disabled={offset + PAGE_SIZE >= list.data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</Button>
        </div>
      </div> : null}
    </>}
    {editingCustomer ? <CustomerFormDialog key={`${workspaceId}:${editingCustomer.id}`} customer={editingCustomer} open
      onOpenChange={(next) => { if (!next) setEditingCustomer(null); }} /> : null}
    {deleteSelection ? <DeleteCustomerDialog key={`${deleteSelection.id}-${deleteSelection.request}`} selection={deleteSelection}
      onConfirm={async (id) => { await remove.mutateAsync(id); setDeleteSelection(null); }} /> : null}
  </div>;
}
