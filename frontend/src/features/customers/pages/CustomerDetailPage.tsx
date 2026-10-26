import { PERMISSION_CODES, type CustomerDetail, type InquiryDetail } from '@trailcomand/shared';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AddIcon, InquiryIcon, SpinnerIcon } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog';
import { CustomerTypeBadge } from '@/features/customers/components/CustomerTypeBadge';
import { useCustomer, useDeleteCustomer } from '@/features/customers/hooks/useCustomers';
import { InquiryStatusBadge } from '@/features/inquiries/components/InquiryBadges';
import { InquiryFormDialog } from '@/features/inquiries/components/InquiryFormDialog';
import { useInquiries } from '@/features/inquiries/hooks/useInquiries';
import { getInitials } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/workspace.store';

const INQUIRY_PAGE_SIZE = 5;

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : '—';
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</dt>
    <dd className="mt-1 break-words text-sm font-medium text-fg">{value || '—'}</dd></div>;
}

function Contact({ customer }: { customer: CustomerDetail }) {
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Contact information</CardTitle></CardHeader><CardContent>
      <dl className="grid gap-5 sm:grid-cols-2">
        <Detail label="Email" value={customer.email ? <a href={`mailto:${customer.email}`} className="hover:underline">{customer.email}</a> : null} />
        <Detail label="Phone" value={customer.phone ? <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a> : null} />
        <Detail label="WhatsApp" value={customer.whatsapp} />
        <Detail label="Nationality" value={customer.nationality} />
        <Detail label="Date of birth" value={formatDate(customer.dateOfBirth)} />
        <Detail label="Address" value={customer.address} />
      </dl>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Emergency contact</CardTitle></CardHeader><CardContent>
      <dl className="grid gap-5 sm:grid-cols-2">
        <Detail label="Name" value={customer.emergencyContactName} />
        <Detail label="Phone" value={customer.emergencyContactPhone} />
      </dl>
    </CardContent></Card>
  </div>;
}

function CustomerSidebar({ customer }: { customer: CustomerDetail }) {
  return <aside className="space-y-6">
    <Card><CardHeader><CardTitle>Source and tags</CardTitle></CardHeader><CardContent>
      <dl className="space-y-5">
        <Detail label="Source" value={customer.source} />
        <Detail label="Tags" value={customer.tags.length ? <div className="flex flex-wrap gap-1">{customer.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div> : null} />
      </dl>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><CardContent>
      <dl className="space-y-5">
        <Detail label="Created" value={formatDate(customer.createdAt)} />
        <Detail label="Updated" value={formatDate(customer.updatedAt)} />
      </dl>
    </CardContent></Card>
  </aside>;
}

function CustomerNotes({ notes }: { notes: string | null }) {
  return <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent>
    <p className="whitespace-pre-wrap break-words text-sm text-fg-muted">{notes || 'No notes yet.'}</p>
  </CardContent></Card>;
}

function LinkedInquiries({ customerId, canCreate }: { customerId: string; canCreate: boolean }) {
  const [offset, setOffset] = useState(0);
  const inquiries = useInquiries({ customerId, limit: INQUIRY_PAGE_SIZE, offset });
  const data = inquiries.data;

  useEffect(() => {
    if (data && offset > 0 && offset >= data.total) {
      setOffset(Math.max(0, Math.ceil(data.total / INQUIRY_PAGE_SIZE) - 1) * INQUIRY_PAGE_SIZE);
    }
  }, [data, offset]);

  return <Card>
    <CardHeader className="flex flex-wrap items-center justify-between gap-3">
      <CardTitle>Inquiries{data && !inquiries.isError ? ` (${data.total})` : ''}</CardTitle>
      {canCreate ? <InquiryFormDialog customerId={customerId} trigger={<Button type="button" size="sm"><AddIcon size={16} />New inquiry</Button>} /> : null}
    </CardHeader>
    <CardContent className="space-y-4">
      {inquiries.isError ? <p className="text-sm text-fg-muted" role="alert">Could not load inquiries. <Button type="button" variant="link" onClick={() => inquiries.refetch()}>Try again</Button></p>
        : inquiries.isPending ? <div role="status" className="space-y-3" aria-label="Loading inquiries">
          {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-8 w-full" />)}
        </div> : data?.items.length ? <>
          <div className="overflow-x-auto"><Table>
            <TableHeader><TableRow><TableHead>Inquiry</TableHead><TableHead>Interest</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>{data.items.map((inquiry: InquiryDetail) => <TableRow key={inquiry.id}>
              <TableCell><Link to={`/inquiries/${inquiry.id}`} className="font-medium hover:underline">{inquiry.inquiryNumber}</Link></TableCell>
              <TableCell>{inquiry.trekInterest || inquiry.destinationText || '—'}</TableCell>
              <TableCell><InquiryStatusBadge status={inquiry.status} /></TableCell>
              <TableCell>{formatDate(inquiry.createdAt)}</TableCell>
            </TableRow>)}</TableBody>
          </Table></div>
          {data.total > INQUIRY_PAGE_SIZE ? <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-fg-muted">
            <span>Showing {offset + 1}–{Math.min(offset + INQUIRY_PAGE_SIZE, data.total)} of {data.total}</span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - INQUIRY_PAGE_SIZE))}>Previous</Button>
              <Button type="button" size="sm" variant="secondary" disabled={offset + INQUIRY_PAGE_SIZE >= data.total} onClick={() => setOffset(offset + INQUIRY_PAGE_SIZE)}>Next</Button>
            </div>
          </div> : null}
        </> : <EmptyState icon={InquiryIcon} title="No inquiries yet" description="No inquiries linked to this customer yet." />}
    </CardContent>
  </Card>;
}

function DetailContent({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.CUSTOMER_UPDATE));
  const canDelete = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.CUSTOMER_DELETE));
  const canReadInquiries = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.INQUIRY_READ));
  const canCreateInquiry = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.INQUIRY_CREATE));
  const customer = useCustomer(customerId);
  const remove = useDeleteCustomer();

  if (!workspaceId) return <p className="text-sm text-fg-muted">Select a workspace to view this customer.</p>;
  if (customer.isPending) return <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-fg-muted">
    <SpinnerIcon size={22} className="animate-spin" /><span>Loading customer...</span>
  </div>;
  if (customer.isError) return <Card className="p-6 text-sm text-fg-muted" role="alert">
    Could not load this customer. <Button type="button" variant="link" onClick={() => customer.refetch()}>Try again</Button>
  </Card>;

  const profile = customer.data;
  return <>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(profile.fullName)}</AvatarFallback></Avatar>
        <div className="min-w-0"><h1 className="truncate text-2xl font-semibold tracking-tight text-fg">{profile.fullName}</h1>
          <div className="mt-2"><CustomerTypeBadge type={profile.customerType} /></div></div>
      </div>
      <div className="flex gap-2">
        {canUpdate ? <CustomerFormDialog key={`${workspaceId}:${profile.id}`} customer={profile} trigger={<Button type="button" variant="secondary">Edit customer</Button>} /> : null}
        {canDelete ? <ConfirmDialog trigger={<Button type="button" variant="ghost" className="text-danger hover:text-danger">Delete</Button>}
          title="Delete customer?" description={`Delete ${profile.fullName}? Their profile will no longer be available.`}
          confirmLabel="Delete customer" variant="danger" onConfirm={async () => {
            await remove.mutateAsync(customerId);
            navigate('/customers', { replace: true });
          }} /> : null}
      </div>
    </header>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-6">
        <Contact customer={profile} />
        {canReadInquiries ? <LinkedInquiries key={`${workspaceId}:${profile.id}`} customerId={profile.id} canCreate={canCreateInquiry} />
          : <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Inquiries</CardTitle>
            {canCreateInquiry ? <InquiryFormDialog customerId={profile.id} trigger={<Button type="button" size="sm"><AddIcon size={16} />New inquiry</Button>} /> : null}
          </CardHeader><CardContent><p className="text-sm text-fg-muted">You do not have permission to view inquiries.</p></CardContent></Card>}
        <CustomerNotes notes={profile.notes} />
      </div>
      <CustomerSidebar customer={profile} />
    </div>
  </>;
}

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  return <div className="mx-auto max-w-6xl space-y-6">
    <Button variant="link" asChild><Link to="/customers">Back Customers</Link></Button>
    {customerId ? <DetailContent customerId={customerId} /> : <p role="alert">Customer not found.</p>}
  </div>;
}
