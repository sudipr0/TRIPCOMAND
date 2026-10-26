import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateRange, formatRelative, cn } from '@/lib/utils';
import { ReportForm } from '@/features/field/components/ReportForm';
import { ErrorIcon, MapPinIcon, TripIcon } from '@/components/icons';
import { OfflineSheet } from '@/features/field/components/OfflineSheet';
import { useFieldTrips, useOfflineSync } from '@/features/field/useField';
import { OfflineSyncBanner } from '@/features/field/components/OfflineSyncBanner';

function statusTone(status: string) {
  if (status === 'IN_PROGRESS') return 'warning' as const;
  if (status === 'READY') return 'info' as const;
  return 'default' as const;
}

function statusLabel(status: string) {
  return status.replace('_', ' ').toLowerCase().replace(/^./, (char) => char.toUpperCase());
}

export function FieldHomePage() {
  const trips = useFieldTrips();
  const sync = useOfflineSync();
  const [reportFor, setReportFor] = useState<{ tripId: string; clientId: string } | null>(null);

  const items = trips.data?.trips ?? [];
  const active = items.find((trip) => trip.status === 'IN_PROGRESS') ?? items[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Good day</h1>
        <p className="mt-1 text-md text-fg-muted">
          {trips.data?.staffId ? 'Your assigned trips are below.' : 'Trips you manage or guide are below.'}
        </p>
      </div>

      <OfflineSyncBanner online={sync.online} pending={sync.pending} syncing={sync.syncing} onFlush={sync.flushNow} />

      {trips.isPending ? (
        <div role="status" className="space-y-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : trips.isError ? (
        <Card role="alert" className="p-5 text-sm text-fg-muted">
          Could not load your trips.{' '}
          <button type="button" className="font-medium text-accent hover:underline" onClick={() => trips.refetch()}>
            Try again
          </button>
        </Card>
      ) : !items.length ? (
        <Card>
          <EmptyState
            icon={TripIcon}
            title="No active trips"
            description="You will see a trip here once the office assigns you to one."
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((trip) => (
            <li key={trip.id}>
              <Card className="overflow-hidden">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide tabular-nums text-fg-subtle">{trip.tripNumber}</p>
                      <Link to={`/field/trips/${trip.id}`} className="mt-0.5 block text-lg font-semibold leading-6 text-fg hover:underline">
                        {trip.name}
                      </Link>
                    </div>
                    <Badge variant={statusTone(trip.status)}>{statusLabel(trip.status)}</Badge>
                  </div>

                  <div className="space-y-1 text-sm text-fg-muted">
                    <p>{formatDateRange(trip.startDate, trip.endDate)}</p>
                    <p className="flex items-center gap-1.5">
                      <MapPinIcon size={14} />
                      {trip.todayDayNumber
                        ? `Today: day ${trip.todayDayNumber}${trip.todayTitle ? ` — ${trip.todayTitle}` : ''}`
                        : 'Trip has not started'}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {trip.lastCheckInAt ? `Last check-in ${formatRelative(trip.lastCheckInAt)}` : 'No check-ins yet'}
                    </p>
                  </div>

                  {trip.openEmergencyReports > 0 ? (
                    <p className="flex items-center gap-1.5 rounded-md border border-danger/40 bg-[hsl(var(--danger)/0.06)] px-3 py-2 text-xs font-medium text-danger">
                      <ErrorIcon size={14} /> {trip.openEmergencyReports} emergency {trip.openEmergencyReports === 1 ? 'report' : 'reports'} on file
                    </p>
                  ) : null}

                  <Link
                    to={`/field/trips/${trip.id}`}
                    className={cn(
                      'flex h-14 w-full items-center justify-center rounded-md bg-accent text-md font-semibold text-accent-fg transition-colors duration-fast hover:bg-accent-hover',
                      'active:scale-[0.99]',
                    )}
                  >
                    Open trip
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {active ? (
        <button
          type="button"
          onClick={() => setReportFor({ tripId: active.id, clientId: crypto.randomUUID() })}
          className="flex h-14 w-full items-center justify-center rounded-lg border border-border bg-bg text-md font-semibold text-fg transition-colors duration-fast hover:bg-bg-muted"
        >
          Send status update
        </button>
      ) : null}

      <OfflineSheet
        open={Boolean(reportFor)}
        title="Send status update"
        onClose={() => setReportFor(null)}
      >
        {reportFor ? (
          <ReportForm
            tripId={reportFor.tripId}
            clientId={reportFor.clientId}
            onDone={() => setReportFor(null)}
            onCancel={() => setReportFor(null)}
          />
        ) : null}
      </OfflineSheet>
    </div>
  );
}
