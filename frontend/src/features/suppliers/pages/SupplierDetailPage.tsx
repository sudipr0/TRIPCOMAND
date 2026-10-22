import type { SupplierRateDetail } from '@tripchange/shared';
import { PERMISSION_CODES } from '@tripchange/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ArrowRightIcon, DeleteIcon, EditIcon, SpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeadlineBadge } from '@/features/suppliers/components/DeadlineBadge';
import { RateFormDialog } from '@/features/suppliers/components/RateFormDialog';
import { SupplierBookingStatusBadge } from '@/features/suppliers/components/SupplierBookingStatusBadge';
import { SupplierCategoryBadge, SupplierStatusBadge } from '@/features/suppliers/components/SupplierBadges';
import { SupplierFormDialog } from '@/features/suppliers/components/SupplierFormDialog';
import { RatingStars } from '@/features/suppliers/pages/SuppliersPage';
import {
  useActiveSupplierBookings, useAlternatives, useDeleteRate, useDeleteSupplier, useRates, useSupplier, useUpdateSupplier,
} from '@/features/suppliers/hooks/useSuppliers';
import { useSupplierBookingsList } from '@/features/suppliers/hooks/useSupplierBookings';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-fg">{value || '—'}</dd>
    </div>
  );
}

function isExpired(rate: SupplierRateDetail) {
  return Boolean(rate.validTo) && new Date(rate.validTo!).getTime() < Date.now();
}

function RatesCard({ supplierId }: { supplierId: string }) {
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.SUPPLIER_UPDATE));
  const [activeOnly, setActiveOnly] = useState(true);
  const rates = useRates(supplierId, { active: activeOnly, limit: 100, offset: 0 });
  const remove = useDeleteRate(supplierId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierRateDetail | undefined>(undefined);
  const [deleting, setDeleting] = useState<SupplierRateDetail | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <CardTitle>Rates</CardTitle>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <Switch aria-label="Active only" checked={activeOnly} onCheckedChange={setActiveOnly} />
            Active only
          </label>
        </div>
        {canUpdate ? <Button type="button" size="sm" variant="secondary" onClick={() => { setEditing(undefined); setOpen(true); }}>Add rate</Button> : null}
      </CardHeader>
      {rates.isPending ? (
        <CardContent><p role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-fg-muted"><SpinnerIcon size={18} className="animate-spin" />Loading rates...</p></CardContent>
      ) : !rates.data?.items.length ? (
        <CardContent><p className="py-6 text-center text-sm text-fg-muted">No rates yet</p></CardContent>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service type</TableHead><TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Unit</TableHead>
                <TableHead>Valid from</TableHead><TableHead>Valid to</TableHead>
                {canUpdate ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.data.items.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="text-sm font-medium text-fg">{rate.serviceType}</TableCell>
                  <TableCell className="text-sm text-fg-muted">{rate.description ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm tabular-nums text-fg">{formatCurrency(rate.amount, rate.currency)}</TableCell>
                  <TableCell className="text-sm text-fg-muted">{rate.unit}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums text-fg-muted">{rate.validFrom ? formatDate(rate.validFrom) : '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs tabular-nums">
                    {!rate.validTo ? <span className="text-fg-subtle">No end</span>
                      : isExpired(rate) ? <Badge variant="danger">Expired</Badge>
                        : <span className="text-fg-muted">{formatDate(rate.validTo)}</span>}
                  </TableCell>
                  {canUpdate ? (
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 px-0" aria-label={`Edit ${rate.serviceType} rate`}
                        onClick={() => { setEditing(rate); setOpen(true); }}><EditIcon size={16} /></Button>
                      <Button type="button" size="sm" variant="ghost" className="h-8 w-8 px-0 text-fg-subtle hover:text-danger" aria-label={`Delete ${rate.serviceType} rate`}
                        onClick={() => setDeleting(rate)}><DeleteIcon size={16} /></Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {open ? <RateFormDialog key={editing?.id ?? 'new'} supplierId={supplierId} rate={editing} open onOpenChange={setOpen} /> : null}
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(next) => { if (!next) setDeleting(null); }}
        title="Delete this rate?" description={deleting ? `Remove the ${deleting.serviceType} rate. Existing bookings keep their recorded costs.` : ''}
        confirmLabel="Delete rate" variant="danger"
        onConfirm={async () => { if (deleting) await remove.mutateAsync(deleting.id); setDeleting(null); }} />
    </Card>
  );
}

function ActivityCard({ supplierId }: { supplierId: string }) {
  const bookings = useSupplierBookingsList(supplierId);
  const items = (bookings.data ?? []).slice(0, 5);
  return (
    <Card>
      <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {bookings.isPending ? <p className="text-sm text-fg-muted">Loading...</p>
          : !items.length ? <p className="text-sm text-fg-muted">No bookings with this supplier yet.</p>
            : items.map((booking) => (
              <div key={booking.id} className="rounded-md border border-border px-3 py-2">
                <p className="truncate text-sm text-fg">{booking.description}</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate text-xs text-fg-muted">{booking.trip?.name ?? 'Trip'}</span>
                  <SupplierBookingStatusBadge status={booking.status} />
                </div>
                {booking.cancellationDeadline ? (
                  <div className="mt-1 flex items-center gap-2 text-xs text-fg-subtle">
                    Cancellation deadline <DeadlineBadge deadline={booking.cancellationDeadline} />
                  </div>
                ) : null}
              </div>
            ))}
      </CardContent>
    </Card>
  );
}

function AlternativesCard({ supplierId }: { supplierId: string }) {
  const alternatives = useAlternatives(supplierId);
  return (
    <Card>
      <CardHeader><CardTitle>Alternatives</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {alternatives.isPending ? <p className="text-sm text-fg-muted">Loading...</p>
          : !alternatives.data?.length ? <p className="text-sm text-fg-muted">No alternatives found in this region.</p>
            : alternatives.data.map((alt) => (
              <Link key={alt.id} to={`/suppliers/${alt.id}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors duration-fast hover:bg-bg-muted">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg">{alt.name}</span>
                  <span className="block text-xs text-fg-muted">{alt.region ?? 'No region'}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <RatingStars rating={alt.rating} />
                  <ArrowRightIcon size={14} />
                </span>
              </Link>
            ))}
      </CardContent>
    </Card>
  );
}

function Content({ supplierId }: { supplierId: string }) {
  const navigate = useNavigate();
  const supplier = useSupplier(supplierId);
  const activeBookings = useActiveSupplierBookings(supplierId);
  const remove = useDeleteSupplier();
  const update = useUpdateSupplier(supplierId);
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.SUPPLIER_UPDATE));
  const [editOpen, setEditOpen] = useState(false);

  if (supplier.isPending) return <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-fg-muted"><SpinnerIcon size={22} className="animate-spin" />Loading supplier...</div>;
  if (supplier.isError) return <Card role="alert" className="p-6 text-sm text-fg-muted">Could not load this supplier. <Button type="button" variant="link" onClick={() => supplier.refetch()}>Try again</Button></Card>;

  const s = supplier.data;
  const count = activeBookings.data?.count ?? 0;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide tabular-nums text-fg-subtle">{s.code ?? s.category}</p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-fg">{s.name}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {s.region ?? 'No region'}{s.contactName ? ` · ${s.contactName}` : ''}{s.phone ? ` · ${s.phone}` : ''}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SupplierCategoryBadge category={s.category} />
            <SupplierStatusBadge status={s.status} />
            <RatingStars rating={s.rating} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate ? <Button type="button" size="sm" variant="secondary" onClick={() => setEditOpen(true)}><EditIcon size={16} />Edit</Button> : null}
          {canUpdate ? (
            <ConfirmDialog trigger={<Button type="button" size="sm" variant="ghost" className="text-danger hover:text-danger">Delete</Button>}
              title="Delete this supplier?" description={`Delete ${s.name}?${count > 0 ? ` This supplier has ${count} active booking${count === 1 ? '' : 's'}.` : ''}`}
              confirmLabel="Delete supplier" variant="danger"
              onConfirm={async () => { await remove.mutateAsync(s.id); navigate('/suppliers'); }} />
          ) : null}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent><dl className="grid gap-5 sm:grid-cols-2">
              <Detail label="Contact name" value={s.contactName} />
              <Detail label="Email" value={s.email} />
              <Detail label="Phone" value={s.phone} />
              <Detail label="WhatsApp" value={s.whatsapp} />
              <Detail label="Address" value={s.address} />
            </dl></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Business</CardTitle></CardHeader>
            <CardContent><dl className="grid gap-5 sm:grid-cols-2">
              <Detail label="Tax ID" value={s.taxId} />
              <Detail label="Payment terms" value={s.paymentTerms} />
              <Detail label="Currency" value={s.currency} />
              <Detail label="Rating" value={<RatingStars rating={s.rating} />} />
            </dl></CardContent>
          </Card>
          <RatesCard supplierId={supplierId} />
          {s.notes ? (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-wrap text-sm text-fg">{s.notes}</p></CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Active bookings</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <p className="text-2xl font-semibold tabular-nums text-fg">{count}</p>
              <p className="text-xs text-fg-muted">{count === 1 ? 'active booking' : 'active bookings'}</p>
              {count > 5 ? <p className="text-xs text-warning">High utilization</p> : null}
            </CardContent>
          </Card>
          <ActivityCard supplierId={supplierId} />
          <AlternativesCard supplierId={supplierId} />
        </aside>
      </div>

      {editOpen ? <SupplierFormDialog key={s.id} supplier={s} open onOpenChange={setEditOpen} /> : null}
      <span className="hidden">{update.isPending ? 'saving' : ''}</span>
    </>
  );
}

export function SupplierDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="link" asChild><Link to="/suppliers">Back to suppliers</Link></Button>
      {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view this supplier.</p>
        : supplierId ? <Content key={`${workspaceId}:${supplierId}`} supplierId={supplierId} />
          : <Skeleton className="h-64 w-full" />}
    </div>
  );
}
