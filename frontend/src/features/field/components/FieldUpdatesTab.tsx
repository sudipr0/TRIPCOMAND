import type { FieldCheckInDetail, FieldReportDetail } from '@trailcomand/shared';

import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ClockIcon, ErrorIcon, MapPinIcon, NotesIcon, InquiryIcon } from '@/components/icons';
import { formatDateTime } from '@/lib/utils';
import { useFieldData, CHECK_IN_LABELS, REPORT_LABELS, SEVERITY_LABELS } from '@/features/field/useField';
import { usePortalHelpRequests } from '@/features/portal/hooks/usePortal';

const CHECK_IN_TONE: Record<string, BadgeVariant> = {
  START: 'info',
  MID: 'default',
  END: 'success',
  DELAY: 'warning',
  ISSUE: 'danger',
  EMERGENCY: 'danger',
};

const SEVERITY_TONE: Record<string, BadgeVariant> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
};

function Placeholder({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">{children}</span>;
}

function CheckInRow({ item }: { item: FieldCheckInDetail }) {
  const coords =
    item.latitude && item.longitude ? `${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}` : null;
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={CHECK_IN_TONE[item.checkInType] ?? 'default'}>
          {CHECK_IN_LABELS[item.checkInType as keyof typeof CHECK_IN_LABELS] ?? item.checkInType}
        </Badge>
        <span className="text-sm font-medium text-fg">{item.staff?.fullName ?? 'Guide'}</span>
        <span className="ml-auto text-xs tabular-nums text-fg-subtle">{formatDateTime(item.recordedAt)}</span>
      </div>
      {item.message ? <p className="mt-1.5 text-sm text-fg">{item.message}</p> : null}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        {item.location ? <Placeholder><MapPinIcon size={12} />{item.location}</Placeholder> : null}
        {item.altitude !== null ? <Placeholder>{item.altitude} m</Placeholder> : null}
        {coords ? <Placeholder>{coords}</Placeholder> : null}
        {item.recordedAt !== item.syncedAt && item.syncedAt ? (
          <Placeholder><ClockIcon size={12} />Synced {formatDateTime(item.syncedAt)}</Placeholder>
        ) : null}
      </div>
    </li>
  );
}

function ReportRow({ item }: { item: FieldReportDetail }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={item.reportType === 'EMERGENCY' ? 'danger' : 'default'}>
          {REPORT_LABELS[item.reportType as keyof typeof REPORT_LABELS] ?? item.reportType}
        </Badge>
        <Badge variant={SEVERITY_TONE[item.severity] ?? 'default'}>
          {SEVERITY_LABELS[item.severity] ?? item.severity}
        </Badge>
        <span className="ml-auto text-xs tabular-nums text-fg-subtle">{formatDateTime(item.recordedAt)}</span>
      </div>
      <p className="mt-1.5 text-sm text-fg">{item.description}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        {item.location ? <Placeholder><MapPinIcon size={12} />{item.location}</Placeholder> : null}
        {item.photoUrls.length ? <Placeholder>{item.photoUrls.length} photo{item.photoUrls.length === 1 ? '' : 's'}</Placeholder> : null}
      </div>
    </li>
  );
}

/** Traveller asks for help in the field: filed through the portal, shown here too. */
function PortalHelpCard({ tripId }: { tripId: string }) {
  const help = usePortalHelpRequests(tripId);
  if (help.isPending || help.isError) return null;
  if (!help.data.length) return null;
  return (
    <Card className="border-warning/40 bg-[hsl(var(--warning)/0.05)]">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <InquiryIcon size={18} className="text-warning" />
        <CardTitle className="text-base">
          {help.data.length} help {help.data.length === 1 ? 'request' : 'requests'} from travellers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-1">
        <ul className="divide-y divide-border">
          {help.data.map((request) => (
            <li key={request.id} className="py-2 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-fg">{request.travelerName}</span>
                <Badge variant="warning">{request.status}</Badge>
                <span className="ml-auto text-xs tabular-nums text-fg-subtle">
                  {formatDateTime(request.createdAt)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{request.message}</p>
              <p className="mt-1 text-xs text-fg-subtle">
                Inquiry {request.inquiryNumber} ·{' '}
                <a className="text-accent hover:underline" href={`/inquiries/${request.inquiryId}`}>
                  Open in inquiries
                </a>
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Office live view: everything the guide crew has sent up from the trail. */
export function FieldUpdatesTab({ tripId }: { tripId: string }) {
  const query = useFieldData(tripId);

  if (query.isPending) {
    return (
      <div role="status" className="space-y-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card role="alert" className="p-5 text-sm text-fg-muted">
        Could not load field updates.{' '}
        <Button type="button" variant="link" onClick={() => query.refetch()}>Try again</Button>
      </Card>
    );
  }

  const { checkIns, reports } = query.data;
  const emergencies = reports.filter((report) => report.reportType === 'EMERGENCY');

  return (
    <div className="space-y-6">
      <PortalHelpCard tripId={tripId} />
      {emergencies.length ? (
        <Card className="border-danger/40 bg-[hsl(var(--danger)/0.04)]" role="alert">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ErrorIcon size={18} className="text-danger" />
            <CardTitle className="text-base text-danger">
              {emergencies.length} emergency {emergencies.length === 1 ? 'report' : 'reports'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            {emergencies.map((report) => (
              <div key={report.id} className="rounded-md border border-danger/30 bg-bg px-3 py-2">
                <p className="text-sm text-fg">{report.description}</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {report.location ? `${report.location} · ` : ''}{formatDateTime(report.recordedAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Check-ins</CardTitle>
          <span className="text-xs text-fg-subtle">{checkIns.length} total</span>
        </CardHeader>
        <CardContent>
          {!checkIns.length ? (
            <EmptyState icon={MapPinIcon} title="No check-ins yet" description="Guide check-ins appear here as they send them from the trail." />
          ) : (
            <ul className="divide-y divide-border">
              {checkIns.map((item) => <CheckInRow key={item.id} item={item} />)}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reports</CardTitle>
          <span className="text-xs text-fg-subtle">{reports.length} total</span>
        </CardHeader>
        <CardContent>
          {!reports.length ? (
            <EmptyState icon={NotesIcon} title="No reports yet" description="Delays, weather, route and safety reports land here." />
          ) : (
            <ul className="divide-y divide-border">
              {reports.map((item) => <ReportRow key={item.id} item={item} />)}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
