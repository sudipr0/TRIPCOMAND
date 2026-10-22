import { PERMISSION_CODES, type InquiryDetail } from '@tripchange/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AddIcon, ChatIcon, QuotationIcon, SpinnerIcon } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Timeline } from '@/components/ui/timeline';
import { AssignInquiryDialog } from '@/features/inquiries/components/AssignInquiryDialog';
import { InquiryActionsMenu, quotationEligible } from '@/features/inquiries/components/InquiryActionsMenu';
import { InquiryPriorityBadge, InquiryStatusBadge } from '@/features/inquiries/components/InquiryBadges';
import { LogActivityDialog } from '@/features/inquiries/components/LogActivityDialog';
import { useAllInquiryCustomers, useInquiry, useInquiryActivities, useInquiryMembers, useUpdateInquiry } from '@/features/inquiries/hooks/useInquiries';
import { QuotationFormDialog } from '@/features/quotations/components/QuotationFormDialog';
import { formatCurrency, formatDateTime, getInitials, relativeDate } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';

const terminal = new Set(['WON', 'LOST', 'DISQUALIFIED']);
const progressStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING', 'DISQUALIFIED'];

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</dt><dd className="mt-1 break-words text-sm text-fg">{value || '—'}</dd></div>;
}
const date = (value: string | null) => value ? formatDateTime(value) : '—';

function InquiryContent({ inquiry }: { inquiry: InquiryDetail }) {
  const navigate = useNavigate();
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.INQUIRY_UPDATE));
  const canQuote = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.QUOTATION_CREATE));
  const [quotationOpen, setQuotationOpen] = useState(false);
  const canCreateQuotation = canQuote && quotationEligible.has(inquiry.status);
  const readyForProposal = canCreateQuotation && (inquiry.status === 'QUALIFIED' || inquiry.status === 'NEGOTIATING');
  // The customer endpoint hides soft-deleted records. Resolve against the live list
  // so an existing inquiry remains readable after its customer is deleted.
  const customers = useAllInquiryCustomers();
  const customer = customers.data?.find((item) => item.id === inquiry.customerId);
  const members = useInquiryMembers();
  const activities = useInquiryActivities(inquiry.id);
  const update = useUpdateInquiry(inquiry.id);
  const assigned = members.data?.find((member) => member.userId === inquiry.assignedToId);
  const assignedName = assigned ? `${assigned.user.firstName} ${assigned.user.lastName}`.trim() : '';
  const actors = new Map(members.data?.map((member) => [member.userId, `${member.user.firstName} ${member.user.lastName}`.trim()]));
  const actorIds = new Map(inquiry.activities?.map((activity) => [activity.id, activity.userId]));
  const timeline = activities.data?.map((activity) => ({ ...activity, userId: actorIds.get(activity.id) ?? null }));

  return <>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm text-fg-muted">{inquiry.inquiryNumber}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{customer?.fullName ?? (customers.isPending ? 'Loading customer...' : 'Customer unavailable')}</h1>
        <p className="mt-1 text-sm text-fg-muted">{inquiry.trekInterest || inquiry.destinationText || 'No trek interest'} · Group of {inquiry.groupSize} · Created {relativeDate(inquiry.createdAt)}</p>
        <div className="mt-3 flex flex-wrap gap-2"><InquiryStatusBadge status={inquiry.status} /><InquiryPriorityBadge priority={inquiry.priority} /></div></div>
      <div className="flex flex-wrap items-center gap-2">
        {canCreateQuotation ? (
          <Button type="button" onClick={() => setQuotationOpen(true)}><QuotationIcon size={16} />Create quotation</Button>
        ) : null}
        <InquiryActionsMenu inquiry={inquiry} showView={false} onDeleted={() => navigate('/inquiries', { replace: true })} />
      </div>
    </header>
    {readyForProposal ? (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent-subtle px-4 py-3">
        <p className="text-sm text-fg">Ready to send a proposal? Build the quotation with dates, line items and terms pre-filled from this inquiry.</p>
        <Button type="button" size="sm" onClick={() => setQuotationOpen(true)}><QuotationIcon size={16} />Create quotation</Button>
      </div>
    ) : null}
    {quotationOpen ? (
      <QuotationFormDialog key={`quotation-${inquiry.id}`} open inquiry={inquiry} onOpenChange={setQuotationOpen} />
    ) : null}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <main className="min-w-0 space-y-6">
        <Card><CardHeader><CardTitle>Trip request</CardTitle></CardHeader><CardContent><dl className="grid gap-5 sm:grid-cols-2">
          <Detail label="Trek interest" value={inquiry.trekInterest} /><Detail label="Destination" value={inquiry.destinationText} />
          <Detail label="Preferred start" value={date(inquiry.preferredStart)} /><Detail label="Preferred end" value={date(inquiry.preferredEnd)} />
          <Detail label="Dates flexible" value={inquiry.flexibleDates ? 'Yes' : 'No'} /><Detail label="Group" value={`${inquiry.groupSize} total · ${inquiry.adults} adults · ${inquiry.children} children`} />
          <Detail label="Budget" value={inquiry.budgetExpectation ? formatCurrency(inquiry.budgetExpectation, inquiry.budgetCurrency) : null} />
          <Detail label="Special requirements" value={<span className="whitespace-pre-wrap">{inquiry.specialRequirements}</span>} />
        </dl></CardContent></Card>
        <Card><CardHeader className="flex flex-wrap items-center justify-between gap-2"><CardTitle>Activity log</CardTitle>
          {canUpdate ? <LogActivityDialog inquiryId={inquiry.id} trigger={<Button type="button" size="sm" variant="secondary"><AddIcon size={16} />Log activity</Button>} /> : null}
        </CardHeader><CardContent>
          {activities.isPending ? <div role="status" aria-label="Loading activities" className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            : activities.isError ? <p role="alert" className="text-sm text-fg-muted">Could not load activity. <Button variant="link" type="button" onClick={() => activities.refetch()}>Try again</Button></p>
              : timeline?.length ? <Timeline activities={timeline} getActorName={(id) => actors.get(id)} />
                : <EmptyState icon={ChatIcon} title="No activities yet" description="Log a call, email, or note to track your outreach." className="py-8" />}
          {activities.data?.length === 100 ? <p className="mt-4 text-xs text-fg-muted">Showing the latest 100 activities.</p> : null}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent>
          <p className="whitespace-pre-wrap break-words text-sm text-fg-muted">{inquiry.notes || 'No notes yet.'}</p>
        </CardContent></Card>
      </main>
      <aside className="space-y-6">
        <Card><CardHeader><CardTitle>Customer</CardTitle></CardHeader><CardContent>
          {customers.isPending ? <Skeleton className="h-10 w-full" /> : customers.isError ? <p role="alert" className="text-sm text-fg-muted">Could not load customers. <Button variant="link" type="button" onClick={() => customers.refetch()}>Try again</Button></p> : customer ? <>
            <Link to={`/customers/${inquiry.customerId}`} className="font-medium text-fg hover:underline">{customer.fullName}</Link>
            <p className="mt-2 text-sm text-fg-muted">{customer.email ?? 'No email'}</p><p className="text-sm text-fg-muted">{customer.phone ?? 'No phone'}</p>
          </> : <p className="text-sm text-fg-muted">Customer unavailable (deleted).</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Assignment &amp; source</CardTitle></CardHeader><CardContent className="space-y-5">
          <div className="space-y-2"><p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Assigned to</p>
            {assignedName ? <div className="flex items-center gap-2 text-sm"><Avatar className="size-7"><AvatarFallback className="text-xs">{getInitials(assignedName)}</AvatarFallback></Avatar>{assignedName}</div> : <p className="text-sm text-fg-muted">{inquiry.assignedToId ? 'Member unavailable' : 'Unassigned'}</p>}
            {canUpdate ? <AssignInquiryDialog inquiryId={inquiry.id} assignedToId={inquiry.assignedToId}
              trigger={<Button type="button" size="sm" variant="secondary">Change assignment</Button>} /> : null}
          </div>
          {canUpdate && !terminal.has(inquiry.status) ? <div className="space-y-2"><label htmlFor="inquiry-status" className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Update stage</label>
            <Select id="inquiry-status" value={inquiry.status} disabled={update.isPending} onChange={(event) => update.mutate({ status: event.target.value as 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'NEGOTIATING' | 'DISQUALIFIED' })}>
              {inquiry.status === 'QUOTED' ? <option value="QUOTED">QUOTED</option> : null}
              {progressStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </Select></div> : null}
          <dl className="space-y-4"><Detail label="Next follow-up" value={date(inquiry.nextFollowUpAt)} />
            <Detail label="Last contacted" value={date(inquiry.lastContactedAt)} /><Detail label="Source" value={inquiry.source} />
            {inquiry.lostReason ? <Detail label="Lost reason" value={inquiry.lostReason} /> : null}
            <Detail label="Created" value={date(inquiry.createdAt)} /><Detail label="Updated" value={date(inquiry.updatedAt)} /></dl>
        </CardContent></Card>
      </aside>
    </div>
  </>;
}

export function InquiryDetailPage() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const inquiry = useInquiry(inquiryId);
  return <div className="mx-auto max-w-6xl space-y-6">
    <Button variant="link" asChild><Link to="/inquiries">Back to inquiries</Link></Button>
    {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view this inquiry.</p>
      : !inquiryId ? <p role="alert">Inquiry not found.</p>
        : inquiry.isPending ? <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-fg-muted"><SpinnerIcon size={22} className="animate-spin" />Loading inquiry...</div>
          : inquiry.isError ? <Card role="alert" className="p-6 text-sm text-fg-muted">Could not load this inquiry. <Button type="button" variant="link" onClick={() => inquiry.refetch()}>Try again</Button></Card>
            : <InquiryContent key={`${workspaceId}:${inquiryId}`} inquiry={inquiry.data} />}
  </div>;
}
