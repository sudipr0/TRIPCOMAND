import { PERMISSION_CODES, type QuotationDetail } from '@trailcomand/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  ArrowRightIcon, BookingIcon, EditIcon, SendIcon, SuccessIcon,
} from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QuotationActionsMenu, type QuotationAction } from '@/features/quotations/components/QuotationActionsMenu';
import { QuotationStatusBadge } from '@/features/quotations/components/QuotationStatusBadge';
import { QuotationFormDialog } from '@/features/quotations/components/QuotationFormDialog';
import { RejectQuotationDialog } from '@/features/quotations/components/RejectQuotationDialog';
import { useAcceptQuotation, useQuotation, useSendQuotation } from '@/features/quotations/hooks/useQuotations';
import {
  daysUntil, formatCurrency, formatDate, formatDateRange, formatDateTime, getInitials,
} from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className="text-right text-sm font-medium tabular-nums text-fg">{value}</dd>
    </div>
  );
}

function Validity({ quotation }: { quotation: QuotationDetail }) {
  if (!quotation.validUntil) return <span className="text-fg-subtle">No expiry</span>;
  const remaining = daysUntil(quotation.validUntil);
  if (quotation.status === 'ACCEPTED') return <span>{formatDate(quotation.validUntil)}</span>;
  if (remaining < 0) return <span className="text-danger">Expired {formatDate(quotation.validUntil)}</span>;
  if (remaining === 0) return <span className="text-warning">Expires today</span>;
  if (remaining < 7) return <span className="text-warning">{remaining} {remaining === 1 ? 'day' : 'days'} left</span>;
  return <span>{formatDate(quotation.validUntil)}</span>;
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg">
        {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
      </ul>
    </div>
  );
}

function LineItems({ quotation }: { quotation: QuotationDetail }) {
  const items = quotation.lineItems ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Line items</CardTitle>
        <span className="text-xs text-fg-subtle">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </CardHeader>
      {items.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead><TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><Badge>{item.category}</Badge></TableCell>
                  <TableCell>
                    <span className="text-sm text-fg">{item.description}</span>
                    {item.isOptional ? <Badge className="ml-2 align-middle">Optional</Badge> : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm tabular-nums text-fg-muted">
                    {Number(item.quantity)} {item.unit}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm tabular-nums text-fg-muted">
                    {formatCurrency(item.unitPrice, quotation.currency)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums text-fg">
                    {formatCurrency(item.total, quotation.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="px-5 py-8 text-center text-sm text-fg-muted">No line items yet — add one to get started</p>
      )}
      <div className="border-t border-border px-5 py-4">
        <dl className="ml-auto w-full max-w-xs space-y-2">
          <SummaryRow label="Subtotal" value={formatCurrency(quotation.subtotal, quotation.currency)} />
          {Number(quotation.discount) > 0 ? (
            <div className="flex items-start justify-between gap-4">
              <dt className="text-sm text-fg-muted">Discount</dt>
              <dd className="text-right text-sm tabular-nums text-danger">-{formatCurrency(quotation.discount, quotation.currency)}</dd>
            </div>
          ) : null}
          {Number(quotation.tax) > 0 ? (
            <div className="flex items-start justify-between gap-4">
              <dt className="text-sm text-fg-muted">Tax</dt>
              <dd className="text-right text-sm tabular-nums text-fg">+{formatCurrency(quotation.tax, quotation.currency)}</dd>
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-4 border-t border-border pt-3">
            <dt className="text-sm font-medium text-fg">Total</dt>
            <dd className="text-right text-lg font-semibold tabular-nums text-accent">{formatCurrency(quotation.total, quotation.currency)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

function Content({ quotation }: { quotation: QuotationDetail }) {
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.QUOTATION_UPDATE));
  const canSend = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.QUOTATION_SEND));
  const canAccept = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.QUOTATION_ACCEPT));
  const canConvert = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.BOOKING_CREATE));
  const [action, setAction] = useState<QuotationAction>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const send = useSendQuotation(quotation.id);
  const accept = useAcceptQuotation(quotation.id);

  const isDraft = quotation.status === 'DRAFT';
  const isSent = quotation.status === 'SENT' || quotation.status === 'VIEWED';
  const isAccepted = quotation.status === 'ACCEPTED';
  const converted = Boolean(quotation.convertedToBookingId);
  const customer = quotation.customer;
  const versions = quotation.versions ?? [];

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide tabular-nums text-fg-subtle">{quotation.quotationNumber}</p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-fg">{customer?.fullName ?? 'Customer unavailable'}</h1>
          <p className="mt-1 text-sm text-fg-muted">{quotation.trekName} · {formatDateRange(quotation.startDate, quotation.endDate)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <QuotationStatusBadge status={quotation.status} />
            {quotation.version > 1 ? <Badge>v{quotation.version}</Badge> : null}
            {converted ? <Badge variant="success">Converted to booking</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canUpdate && isDraft ? <Button type="button" variant="secondary" size="sm" onClick={() => setAction('edit')}><EditIcon size={16} />Edit</Button> : null}
          {canSend && isDraft ? <Button type="button" size="sm" disabled={send.isPending} onClick={() => send.mutate()}><SendIcon size={16} />{send.isPending ? 'Sending...' : 'Send'}</Button> : null}
          {canAccept && isSent ? (
            <ConfirmDialog trigger={<Button type="button" size="sm"><SuccessIcon size={16} />Accept</Button>}
              title="Accept quotation?" description={`Mark ${quotation.quotationNumber} as accepted? You can convert it to a booking afterwards.`}
              confirmLabel="Accept quotation" onConfirm={async () => { await accept.mutateAsync(); }} />
          ) : null}
          {canAccept && isSent ? <Button type="button" variant="secondary" size="sm" onClick={() => setRejectOpen(true)}>Reject</Button> : null}
          {canConvert && isAccepted && !converted
            ? <Button type="button" size="sm" onClick={() => setAction('convert')}><BookingIcon size={16} />Convert to booking</Button>
            : null}
          {converted ? <Button type="button" size="sm" asChild><Link to={`/bookings/${quotation.convertedToBookingId}`}><BookingIcon size={16} />View booking</Link></Button> : null}
          <QuotationActionsMenu quotation={quotation} showView={false} action={action} onActionChange={setAction} />
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <main className="min-w-0 space-y-6">
          <LineItems quotation={quotation} />

          {quotation.inclusions.length || quotation.exclusions.length || quotation.terms || quotation.notes ? (
            <Card>
              <CardHeader><CardTitle>Notes and terms</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Bullets title="Inclusions" items={quotation.inclusions} />
                  <Bullets title="Exclusions" items={quotation.exclusions} />
                </div>
                {quotation.terms ? (
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Terms</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-fg">{quotation.terms}</p>
                  </div>
                ) : null}
                {quotation.notes ? (
                  <div>
                    <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Notes</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-fg">{quotation.notes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </main>

        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3">
                <SummaryRow label="Total" value={<span className="text-base font-semibold text-accent">{formatCurrency(quotation.total, quotation.currency)}</span>} />
                <SummaryRow label="Valid until" value={<Validity quotation={quotation} />} />
                <SummaryRow label="Group size" value={quotation.groupSize} />
                <SummaryRow label="Dates" value={formatDateRange(quotation.startDate, quotation.endDate)} />
              </dl>
              {converted ? (
                <Button variant="link" asChild className="h-auto px-0 text-sm">
                  <Link to={`/bookings/${quotation.convertedToBookingId}`} className="inline-flex items-center gap-1">
                    View booking <ArrowRightIcon size={14} />
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(customer?.fullName ?? '—')}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{customer?.fullName ?? 'Customer unavailable'}</p>
                  <p className="truncate text-sm text-fg-muted">{customer?.email ?? 'No email'}</p>
                  <p className="text-sm text-fg-muted">{customer?.phone ?? 'No phone'}</p>
                </div>
              </div>
              <Button variant="link" asChild className="mt-3 h-auto px-0 text-sm">
                <Link to={`/customers/${quotation.customerId}`} className="inline-flex items-center gap-1">View customer <ArrowRightIcon size={14} /></Link>
              </Button>
            </CardContent>
          </Card>

          {versions.length ? (
            <Card>
              <CardHeader><CardTitle>Version history</CardTitle></CardHeader>
              <CardContent>
                <ol className="ml-1 space-y-4 border-l border-border">
                  {versions.map((version) => (
                    <li key={version.id} className="relative ml-5">
                      <span aria-hidden="true"
                        className={`absolute -left-6 top-1 h-2 w-2 rounded-full ${version.version === quotation.version ? 'bg-accent' : 'bg-bg-muted'}`} />
                      <p className={`text-sm ${version.version === quotation.version ? 'font-medium text-fg' : 'text-fg-muted'}`}>
                        v{version.version}{version.version === quotation.version ? ' · Current' : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-fg-subtle">
                        {version.changeReason ?? 'Snapshot'} · <time dateTime={version.createdAt}>{formatDateTime(version.createdAt)}</time>
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <SummaryRow label="Created" value={formatDateTime(quotation.createdAt)} />
                {quotation.sentAt ? <SummaryRow label="Sent" value={formatDateTime(quotation.sentAt)} /> : null}
                {quotation.acceptedAt ? <SummaryRow label="Accepted" value={formatDateTime(quotation.acceptedAt)} /> : null}
                {quotation.rejectedAt ? <SummaryRow label="Rejected" value={formatDateTime(quotation.rejectedAt)} /> : null}
              </dl>
              {quotation.rejectionReason ? (
                <p className="mt-3 rounded-md bg-bg-subtle px-3 py-2 text-xs text-fg-muted">
                  <span className="font-medium text-fg">Reason: </span>{quotation.rejectionReason}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>

      {action === 'edit' ? <QuotationFormDialog key={quotation.id} open quotation={quotation} onOpenChange={(next) => { if (!next) setAction(null); }} /> : null}
      <RejectQuotationDialog open={rejectOpen} quotationId={quotation.id} quotationNumber={quotation.quotationNumber} onOpenChange={setRejectOpen} />
    </>
  );
}

export function QuotationDetailPage() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const quotation = useQuotation(quotationId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="link" asChild><Link to="/quotations">Back to quotations</Link></Button>
      {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view this quotation.</p>
        : quotation.isPending ? <div role="status" className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Skeleton className="h-72 w-full" /><Skeleton className="h-72 w-full" />
          </div>
        </div>
          : quotation.isError ? <Card role="alert" className="p-6 text-sm text-fg-muted">
            Could not load this quotation. <Button type="button" variant="link" onClick={() => quotation.refetch()}>Try again</Button>
          </Card>
            : <Content key={`${workspaceId}:${quotation.data.id}`} quotation={quotation.data} />}
    </div>
  );
}
