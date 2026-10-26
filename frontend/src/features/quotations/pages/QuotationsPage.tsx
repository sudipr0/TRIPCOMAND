import { PERMISSION_CODES, QUOTATION_STATUSES, type QuotationStatus } from '@trailcomand/shared';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AddIcon, QuotationIcon, SearchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAllInquiryCustomers } from '@/features/inquiries/hooks/useInquiries';
import { QuotationActionsMenu } from '@/features/quotations/components/QuotationActionsMenu';
import { QuotationStatusBadge, quotationStatusLabels } from '@/features/quotations/components/QuotationStatusBadge';
import { QuotationFormDialog } from '@/features/quotations/components/QuotationFormDialog';
import { useQuotations } from '@/features/quotations/hooks/useQuotations';
import { daysUntil, formatCurrency, formatDate, formatDateRange } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';

const PAGE_SIZE = 20;

function TableSkeleton() {
  return (
    <TableBody>
      {Array.from({ length: 5 }, (_, row) => (
        <TableRow key={row}>
          {Array.from({ length: 8 }, (_, column) => <TableCell key={column}><Skeleton className="h-5 w-24" /></TableCell>)}
        </TableRow>
      ))}
    </TableBody>
  );
}

function Validity({ validUntil, status }: { validUntil: string | null; status: string }) {
  if (!validUntil) return <span className="text-xs text-fg-subtle">—</span>;
  const remaining = daysUntil(validUntil);
  if (remaining < 0 && status !== 'ACCEPTED') return <span className="text-xs font-medium text-danger">Expired</span>;
  if (remaining >= 0 && remaining < 7 && status !== 'ACCEPTED' && status !== 'REJECTED') {
    return <span className="text-xs font-medium text-warning">{remaining === 0 ? 'Expires today' : `${remaining} ${remaining === 1 ? 'day' : 'days'} left`}</span>;
  }
  return <span className="text-xs text-fg-subtle">{formatDate(validUntil)}</span>;
}

export function QuotationsPage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const canCreate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.QUOTATION_CREATE));
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<QuotationStatus | ''>('');
  const [customerId, setCustomerId] = useState('');
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next !== search) { setSearch(next); setOffset(0); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => { setOffset(0); setCreating(false); }, [workspaceId]);

  const list = useQuotations({
    limit: PAGE_SIZE, offset,
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
  });
  const customers = useAllInquiryCustomers();
  const customerNames = new Map(customers.data?.map((customer) => [customer.id, customer.fullName]));
  const filtered = Boolean(search || status || customerId);

  useEffect(() => {
    if (list.data && offset > 0 && offset >= list.data.total) {
      setOffset(Math.max(0, Math.ceil(list.data.total / PAGE_SIZE) - 1) * PAGE_SIZE);
    }
  }, [list.data, offset]);

  const newQuotationButton = (label: string, variant: 'primary' | 'secondary' = 'primary') =>
    canCreate ? <Button type="button" variant={variant} onClick={() => setCreating(true)}><AddIcon size={16} />{label}</Button> : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">Quotations</h1>
          <p className="mt-2 text-sm text-fg-muted">Pricing and proposals sent to customers</p>
        </div>
        {newQuotationButton('New quotation')}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <SearchIcon size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <Input aria-label="Search quotations" placeholder="Search number or trek" maxLength={120} className="pl-9"
            value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
        </div>
        <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as QuotationStatus | ''); setOffset(0); }}>
          <option value="">All statuses</option>
          {QUOTATION_STATUSES.map((item) => <option key={item} value={item}>{quotationStatusLabels[item] ?? item}</option>)}
        </Select>
        <Select aria-label="Filter by customer" value={customerId} disabled={customers.isPending || customers.isError}
          onChange={(event) => { setCustomerId(event.target.value); setOffset(0); }}>
          <option value="">All customers</option>
          {customers.data?.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName}</option>)}
        </Select>
        {list.data ? <span className="ml-auto whitespace-nowrap text-sm text-fg-muted">
          {list.data.total} {list.data.total === 1 ? 'quotation' : 'quotations'}
        </span> : null}
      </div>

      {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view quotations.</p>
        : list.isError ? <Card role="alert" className="p-6 text-sm text-fg-muted">
          Could not load quotations. <Button type="button" variant="link" onClick={() => list.refetch()}>Try again</Button>
        </Card>
          : <>
            <Card className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead>Trek</TableHead>
                    <TableHead>Dates</TableHead><TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead><TableHead>Valid until</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                {list.isPending ? <TableSkeleton /> : list.data?.items.length ? (
                  <TableBody>
                    {list.data.items.map((quotation) => (
                      <TableRow key={quotation.id} tabIndex={0} aria-label={`View ${quotation.quotationNumber}`}
                        className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                        onClick={(event) => {
                          if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
                          if (event.target instanceof Element && event.target.closest('a, button, [role="menuitem"]')) return;
                          navigate(`/quotations/${quotation.id}`);
                        }}
                        onKeyDown={(event) => {
                          if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                            event.preventDefault();
                            navigate(`/quotations/${quotation.id}`);
                          }
                        }}>
                        <TableCell className="whitespace-nowrap"><Link to={`/quotations/${quotation.id}`}
                          className="text-xs font-medium tabular-nums text-fg-subtle hover:underline">{quotation.quotationNumber}</Link></TableCell>
                        <TableCell className="text-sm font-medium text-fg">{quotation.customer?.fullName ?? customerNames.get(quotation.customerId) ?? '—'}</TableCell>
                        <TableCell className="max-w-48 truncate text-sm text-fg-muted" title={quotation.trekName}>{quotation.trekName}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-fg-muted">{formatDateRange(quotation.startDate, quotation.endDate)}</TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm font-medium tabular-nums text-fg">{formatCurrency(quotation.total, quotation.currency)}</TableCell>
                        <TableCell><QuotationStatusBadge status={quotation.status} /></TableCell>
                        <TableCell className="whitespace-nowrap"><Validity validUntil={quotation.validUntil} status={quotation.status} /></TableCell>
                        <TableCell>
                          <div className="flex justify-end" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                            <QuotationActionsMenu quotation={quotation} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                ) : (
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={8}>
                        <EmptyState icon={QuotationIcon} title={filtered ? 'No matching quotations' : 'No quotations yet'}
                          description={filtered ? 'Try another search or filter.' : 'Build a proposal from an inquiry, or start from scratch.'}
                          action={!filtered ? newQuotationButton('Create quotation', 'secondary') : undefined} />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </Card>
            {list.data && list.data.total > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
              <span>Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, list.data.total)} of {list.data.total}</span>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</Button>
                <Button type="button" size="sm" variant="secondary" disabled={offset + PAGE_SIZE >= list.data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</Button>
              </div>
            </div> : null}
          </>}

      {creating ? <QuotationFormDialog open key="new-quotation" onOpenChange={(next) => { if (!next) setCreating(false); }} /> : null}
    </div>
  );
}
