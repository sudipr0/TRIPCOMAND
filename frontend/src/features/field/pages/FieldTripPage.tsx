import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrip } from '@/features/trips/hooks/useTrips';
import { formatDateRange, formatDateTime } from '@/lib/utils';
import { ReportForm } from '@/features/field/components/ReportForm';
import { CheckInForm } from '@/features/field/components/CheckInForm';
import { OfflineSheet } from '@/features/field/components/OfflineSheet';
import { EmergencyButton } from '@/features/field/components/EmergencyButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OfflineSyncBanner } from '@/features/field/components/OfflineSyncBanner';
import { BedIcon, MapPinIcon, MountainsIcon, WalkingIcon } from '@/components/icons';
import { CHECK_IN_LABELS, useFieldData, useOfflineSync } from '@/features/field/useField';

type Sheet = { kind: 'check-in' | 'report'; clientId: string } | null;

/** The itinerary day that matches today, or day 1 before departure. */
function useTodayDay(trip: ReturnType<typeof useTrip>['data']) {
  return useMemo(() => {
    if (!trip?.itineraryDays?.length) return null;
    const start = new Date(`${trip.startDate.slice(0, 10)}T00:00:00`);
    const today = new Date();
    const offset = Math.floor((today.setHours(0, 0, 0, 0) - start.getTime()) / 86_400_000);
    return trip.itineraryDays.find((day) => day.dayNumber === offset + 1) ?? trip.itineraryDays[0] ?? null;
  }, [trip]);
}

export function FieldTripPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const trip = useTrip(tripId);
  const fieldData = useFieldData(tripId);
  const sync = useOfflineSync();
  const todayDay = useTodayDay(trip.data);
  const [sheet, setSheet] = useState<Sheet>(null);

  const lastCheckIn = fieldData.data?.checkIns[0];
  const recent = fieldData.data?.checkIns.slice(0, 5) ?? [];

  function openCheckIn() {
    setSheet({ kind: 'check-in', clientId: crypto.randomUUID() });
  }

  function openReport() {
    setSheet({ kind: 'report', clientId: crypto.randomUUID() });
  }

  async function handleEmergency(input: Parameters<typeof sync.sendEmergencyNow>[1]) {
    if (!tripId) return 'queued';
    return sync.sendEmergencyNow(tripId, input);
  }

  if (trip.isPending) {
    return (
      <div role="status" className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (trip.isError || !trip.data) {
    return (
      <Card role="alert" className="p-5 text-sm text-fg-muted">
        Could not load this trip.{' '}
        <Button type="button" variant="link" onClick={() => trip.refetch()}>Try again</Button>
      </Card>
    );
  }

  const data = trip.data;

  return (
    <div className="space-y-4">
      <Link to="/field" className="inline-block text-sm font-medium text-accent hover:underline">
        Back to trips
      </Link>

      <header>
        <p className="text-xs uppercase tracking-wide tabular-nums text-fg-subtle">{data.tripNumber}</p>
        <h1 className="mt-1 text-2xl font-semibold leading-8 tracking-tight text-fg">{data.name}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {formatDateRange(data.startDate, data.endDate)} · {data.groupSize} travelers
        </p>
      </header>

      <OfflineSyncBanner online={sync.online} pending={sync.pending} syncing={sync.syncing} onFlush={sync.flushNow} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today&apos;s plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayDay ? (
            <>
              <p className="text-xs uppercase tracking-wide text-fg-subtle">Day {todayDay.dayNumber}</p>
              <p className="text-lg font-medium text-fg">{todayDay.title}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                {todayDay.location ? <span className="inline-flex items-center gap-1"><MapPinIcon size={14} />{todayDay.location}</span> : null}
                {todayDay.altitude !== null ? <span className="inline-flex items-center gap-1"><MountainsIcon size={14} />{todayDay.altitude} m</span> : null}
                {todayDay.walkingHours ? <span className="inline-flex items-center gap-1"><WalkingIcon size={14} />{todayDay.walkingHours} h</span> : null}
                {todayDay.accommodation ? <span className="inline-flex items-center gap-1"><BedIcon size={14} />{todayDay.accommodation}</span> : null}
              </div>
              {todayDay.description ? <p className="pt-1 text-sm text-fg-muted">{todayDay.description}</p> : null}
            </>
          ) : (
            <p className="text-sm text-fg-muted">No itinerary published for this trip yet.</p>
          )}
        </CardContent>
      </Card>

      <Button type="button" size="lg" className="h-16 w-full text-lg font-semibold" onClick={openCheckIn}>
        Check In
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={openCheckIn}
          className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-bg text-sm font-semibold text-fg transition-colors duration-fast hover:bg-bg-muted">
          Start Day
          <span className="text-xs font-normal text-fg-subtle">Check-in at the trailhead</span>
        </button>
        <button type="button" onClick={openReport}
          className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-bg text-sm font-semibold text-fg transition-colors duration-fast hover:bg-bg-muted">
          Report Delay
          <span className="text-xs font-normal text-fg-subtle">Tell the office</span>
        </button>
        <button type="button" onClick={openReport}
          className="flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-border bg-bg text-sm font-semibold text-fg transition-colors duration-fast hover:bg-bg-muted col-span-2">
          Report Issue
          <span className="text-xs font-normal text-fg-subtle">Route, weather, supplier or traveler</span>
        </button>
      </div>

      <EmergencyButton
        onSend={handleEmergency}
        onResult={(outcome) => {
          if (outcome === 'sent') toast.success('Emergency sent to the office');
          else toast.warning('Offline — emergency saved and will send the moment you reconnect');
        }}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Your latest check-ins</CardTitle>
          {lastCheckIn ? <span className="text-xs text-fg-subtle">{formatDateTime(lastCheckIn.recordedAt)}</span> : null}
        </CardHeader>
        <CardContent>
          {!recent.length ? (
            <p className="text-sm text-fg-muted">No check-ins for this trip yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg">{CHECK_IN_LABELS[item.checkInType as keyof typeof CHECK_IN_LABELS] ?? item.checkInType}</p>
                    <p className="truncate text-xs text-fg-muted">{item.message ?? item.location ?? 'No notes'}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-fg-subtle">{formatDateTime(item.recordedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* One sheet at a time, mounted only while open: a fresh form each time, and
          no hidden duplicate <form> left in the document. */}
      {sheet ? (
        <OfflineSheet
          open
          key={sheet.clientId}
          onClose={() => setSheet(null)}
          title={sheet.kind === 'check-in' ? 'Check in' : 'Report to the office'}
        >
          {tripId ? (
            sheet.kind === 'check-in'
              ? <CheckInForm tripId={tripId} clientId={sheet.clientId} onDone={() => setSheet(null)} onCancel={() => setSheet(null)} />
              : <ReportForm tripId={tripId} clientId={sheet.clientId} onDone={() => setSheet(null)} onCancel={() => setSheet(null)} />
          ) : null}
        </OfflineSheet>
      ) : null}
    </div>
  );
}
