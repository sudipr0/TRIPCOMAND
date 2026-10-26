import { INQUIRY_PRIORITIES, INQUIRY_STATUSES, PERMISSION_CODES, type InquiryPriority, type InquiryStatus } from '@trailcomand/shared';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AddIcon, InquiryIcon, SearchIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InquiryActionsMenu } from '@/features/inquiries/components/InquiryActionsMenu';
import { InquiryPriorityBadge, InquiryStatusBadge } from '@/features/inquiries/components/InquiryBadges';
import { InquiryFormDialog } from '@/features/inquiries/components/InquiryFormDialog';
import { InquiryKanbanCard } from '@/features/inquiries/components/InquiryKanbanCard';
import { useAllInquiryCustomers, useAllInquiries, useInquiryMembers } from '@/features/inquiries/hooks/useInquiries';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useWorkspaceStore } from '@/stores/workspace.store';

const PAGE_SIZE = 20;
type Assignment = 'all' | 'me' | 'unassigned';

function InquiryTableSkeleton() {
  return <Card className="overflow-x-auto"><Table>
    <TableHeader><TableRow>{['Inquiry number', 'Customer', 'Trek interest', 'Group size', 'Priority', 'Status', 'Assigned', 'Created', 'Actions'].map((title) => <TableHead key={title}>{title}</TableHead>)}</TableRow></TableHeader>
    <TableBody>{Array.from({ length: 5 }, (_, row) => <TableRow key={row}>
      {Array.from({ length: 9 }, (_, column) => <TableCell key={column}><Skeleton className="h-5 w-24" /></TableCell>)}
    </TableRow>)}</TableBody>
  </Table></Card>;
}

export function InquiriesPage() {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const canCreate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.INQUIRY_CREATE));
  const userId = useAuthStore((state) => state.user?.id);
  const [view, setView] = useState<'pipeline' | 'table'>('pipeline');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InquiryStatus | ''>('');
  const [priority, setPriority] = useState<InquiryPriority | ''>('');
  const [assignment, setAssignment] = useState<Assignment>('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => { setPage(0); }, [workspaceId, search, status, priority, assignment, view]);

  // "me" is a server filter; "unassigned" has no backend equivalent, so it is filtered in the browser.
  const serverFilters = {
    ...(search ? { search } : {}), ...(status ? { status } : {}), ...(priority ? { priority } : {}),
    ...(assignment === 'me' && userId ? { assignedToId: userId } : {}),
  };
  const list = useAllInquiries(serverFilters);
  const customers = useAllInquiryCustomers();
  const members = useInquiryMembers();
  const names = new Map(customers.data?.map((customer) => [customer.id, customer.fullName]));
  const assignees = new Map(members.data?.map((member) => [member.userId, member]));
  const filtered = (list.data ?? []).filter((inquiry) => assignment !== 'unassigned' || !inquiry.assignedToId);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasFilters = Boolean(search || status || priority || assignment !== 'all');
  useEffect(() => {
    if (list.data && page > 0 && page * PAGE_SIZE >= filtered.length) setPage(Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
  }, [filtered.length, list.data, page]);

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-3xl font-semibold tracking-tight text-fg">Inquiries</h1>
        <p className="mt-2 text-sm text-fg-muted">Sales pipeline and lead management</p></div>
      {canCreate ? <InquiryFormDialog trigger={<Button type="button"><AddIcon size={16} />New inquiry</Button>} /> : null}
    </header>
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-52 flex-1 sm:max-w-sm"><SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
        <Input aria-label="Search inquiries" placeholder="Search number, trek or customer" maxLength={120} className="pl-9" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div>
      <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as InquiryStatus | '')}>
        <option value="">All statuses</option>{INQUIRY_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
      </Select>
      <Select aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value as InquiryPriority | '')}>
        <option value="">All priorities</option>{INQUIRY_PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
      </Select>
      <Select aria-label="Filter by assignment" value={assignment} onChange={(event) => setAssignment(event.target.value as Assignment)}>
        <option value="all">All assignees</option><option value="me" disabled={!userId}>Assigned to me</option><option value="unassigned">Unassigned</option>
      </Select>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs value={view} onValueChange={(value) => setView(value as 'pipeline' | 'table')} className="w-auto">
        <TabsList><TabsTrigger value="pipeline">Pipeline</TabsTrigger><TabsTrigger value="table">Table</TabsTrigger></TabsList>
      </Tabs>
      {list.data ? <span className="text-sm text-fg-muted">{filtered.length} {filtered.length === 1 ? 'inquiry' : 'inquiries'}</span> : null}
    </div>
    {assignment === 'unassigned' ? <p className="text-xs text-fg-muted">Unassigned inquiries are filtered in this browser after loading every page. Counts reflect the complete loaded result.</p> : null}
    {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view inquiries.</p> : list.isError ? <Card role="alert" className="p-6 text-sm text-fg-muted">Could not load all inquiries. <Button variant="link" type="button" onClick={() => list.refetch()}>Try again</Button></Card>
        : list.isPending || customers.isPending || members.isPending ? view === 'table' ? <InquiryTableSkeleton />
          : <div role="status" aria-label="Loading inquiries" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-44 w-full" />)}</div>
        : view === 'table' && !filtered.length ? <Card><EmptyState icon={InquiryIcon} title={hasFilters ? 'No matching inquiries' : 'No inquiries yet'}
          description={hasFilters ? 'Try another search or filter.' : 'Create your first inquiry to start tracking the pipeline.'}
          action={canCreate && !hasFilters ? <InquiryFormDialog trigger={<Button type="button">New inquiry</Button>} /> : undefined} /></Card>
          : view === 'pipeline' ? <div className="overflow-x-auto pb-3">
            {!filtered.length ? <Card className="mb-4"><EmptyState icon={InquiryIcon} title={hasFilters ? 'No matching inquiries' : 'No inquiries yet'}
              description={hasFilters ? 'Try another search or filter.' : 'Create your first inquiry to start tracking the pipeline.'}
              action={canCreate && !hasFilters ? <InquiryFormDialog trigger={<Button type="button">New inquiry</Button>} /> : undefined} className="py-8" /></Card> : null}
            <div className="flex min-w-max items-start gap-4">
              {INQUIRY_STATUSES.map((item) => {
                const column = filtered.filter((inquiry) => inquiry.status === item);
                return <section key={item} aria-label={`${item} inquiries`} className="min-w-[280px] w-[280px] shrink-0 space-y-3 rounded-lg bg-bg-subtle p-3">
                  <div className="flex items-center justify-between text-sm font-semibold text-fg"><span>{item}</span><Badge>{column.length}</Badge></div>
                  {column.length ? column.map((inquiry) => <InquiryKanbanCard key={inquiry.id} inquiry={inquiry} customerName={names.get(inquiry.customerId)} member={assignees.get(inquiry.assignedToId ?? '')} />)
                    : <div className="rounded-md border border-dashed border-border p-5 text-center text-xs text-fg-muted">No inquiries</div>}
                </section>;
              })}
            </div>
          </div> : <>
            <Card className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Inquiry number</TableHead><TableHead>Customer</TableHead><TableHead>Trek interest</TableHead><TableHead>Group size</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead><TableHead>Assigned</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{visible.map((inquiry) => {
                const member = assignees.get(inquiry.assignedToId ?? '');
                return <TableRow key={inquiry.id} className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  tabIndex={0} aria-label={`View ${inquiry.inquiryNumber}`} onClick={(event) => {
                    // Dialogs render in portals but their React events still bubble through this row.
                    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;
                    if (event.target instanceof Element && event.target.closest('a, button, [role="menuitem"]')) return;
                    navigate(`/inquiries/${inquiry.id}`);
                  }} onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); navigate(`/inquiries/${inquiry.id}`); }
                  }}>
                  <TableCell><Link className="font-medium text-fg hover:underline" to={`/inquiries/${inquiry.id}`}>{inquiry.inquiryNumber}</Link></TableCell>
                  <TableCell>{names.get(inquiry.customerId) ?? '—'}</TableCell>
                  <TableCell>{inquiry.trekInterest || inquiry.destinationText || '—'}</TableCell>
                  <TableCell>{inquiry.groupSize}</TableCell>
                  <TableCell><InquiryPriorityBadge priority={inquiry.priority} /></TableCell>
                  <TableCell><InquiryStatusBadge status={inquiry.status} /></TableCell>
                  <TableCell>{member ? `${member.user.firstName} ${member.user.lastName}` : inquiry.assignedToId ? 'Member unavailable' : 'Unassigned'}</TableCell>
                  <TableCell>{formatDate(inquiry.createdAt)}</TableCell>
                  <TableCell><div className="flex justify-end"><InquiryActionsMenu inquiry={inquiry} /></div></TableCell>
                </TableRow>;
              })}</TableBody>
            </Table></Card>
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted"><span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div className="flex gap-2"><Button type="button" size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button type="button" size="sm" variant="secondary" disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(page + 1)}>Next</Button></div></div>
          </>}
    {(customers.isError || members.isError) && list.data ? <p role="alert" className="text-sm text-fg-muted">{customers.isError ? 'Customer names unavailable. ' : ''}{members.isError ? 'Member names unavailable. ' : ''}
      <Button type="button" variant="link" onClick={() => { if (customers.isError) void customers.refetch(); if (members.isError) void members.refetch(); }}>Try again</Button></p> : null}
  </div>;
}
