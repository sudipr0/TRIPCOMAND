import type { PortalCommandCenter, PortalItineraryDay } from '@trailcomand/shared';

import { formatDateRange } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UpdateStateBadge } from '@/features/portal/components/PortalPrimitives';
import { CalendarIcon, ChevronDownIcon, MapPinIcon, StarIcon } from '@/components/icons';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function NextActivityCard({
  day,
  currentDayNumber,
  onOpenItinerary,
}: {
  day: PortalItineraryDay | null;
  currentDayNumber: number | null;
  onOpenItinerary: () => void;
}) {
  if (!day) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Next up</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-fg-muted">
            No upcoming itinerary day is currently scheduled. Your organizer will update this as the trip
            progresses.
          </p>
        </CardContent>
      </Card>
    );
  }

  const route =
    day.startLocation && day.endLocation && day.startLocation !== day.endLocation
      ? `${day.startLocation} → ${day.endLocation}`
      : (day.endLocation ?? day.startLocation ?? day.location);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">Next up</CardTitle>
        <Button type="button" variant="link" size="sm" onClick={onOpenItinerary}>
          Full itinerary
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <p className="text-xs uppercase tracking-wide text-fg-subtle">
          Day {day.dayNumber}
          {day.date ? ` · ${new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}` : ''}
          {currentDayNumber === day.dayNumber ? ' · today' : ''}
        </p>
        <p className="text-base font-medium text-fg">{day.title}</p>
        {route ? (
          <p className="flex items-start gap-1.5 text-sm text-fg-muted">
            <MapPinIcon size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{route}</span>
          </p>
        ) : null}
        {day.accommodation ? (
          <p className="text-sm text-fg-muted">Staying at: {day.accommodation}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function UnacknowledgedList({
  updates,
  onOpenUpdates,
}: {
  updates: PortalCommandCenter['home']['unacknowledged'];
  onOpenUpdates: () => void;
}) {
  if (!updates.length) return null;
  return (
    <Card className="border-warning/50 bg-[hsl(var(--warning)/0.06)]">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">
          Action needed — {updates.length} {updates.length === 1 ? 'update' : 'updates'} to read
        </CardTitle>
        <Button type="button" size="sm" onClick={onOpenUpdates}>
          Open
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {updates.slice(0, 3).map((update) => (
            <li key={update.id} className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{update.title}</p>
              <p className="line-clamp-2 text-xs text-fg-muted">{update.description}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function TripHomeTab({
  data,
  onOpenItinerary,
  onOpenUpdates,
}: {
  data: PortalCommandCenter;
  onOpenItinerary: () => void;
  onOpenUpdates: () => void;
}) {
  const { home, trip, visitor } = data;
  const headline = home.headlineUpdate;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.08em] text-fg-subtle">{greeting()}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          Hello, {visitor.fullName.split(' ')[0]}
        </h1>
        <p className="text-sm text-fg-muted">{visitor.fullName} · {visitor.isTripLeader ? 'Trip leader' : 'Traveller'}</p>
      </header>

      <Card className="bg-bg-subtle">
        <CardContent className="space-y-2 p-4">
          <p className="text-base font-semibold text-fg">{trip.name}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            <span className="tabular-nums">{formatDateRange(trip.startDate, trip.endDate)}</span>
            <span className="tabular-nums text-fg-subtle">{trip.tripNumber}</span>
          </p>
          {trip.currentDayNumber ? (
            <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <CalendarIcon size={13} aria-hidden="true" />
              Day {trip.currentDayNumber} of the trip · dates in {trip.timezone}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
              <CalendarIcon size={13} aria-hidden="true" />
              Dates shown in {trip.timezone}
            </p>
          )}
        </CardContent>
      </Card>

      <Card
        role="status"
        className={
          home.status === 'PENDING'
            ? 'border-warning/50 bg-[hsl(var(--warning)/0.08)]'
            : 'border-success/40 bg-[hsl(var(--success)/0.06)]'
        }
      >
        <CardContent className="flex items-start gap-3 p-4">
          <StarIcon
            size={18}
            aria-hidden="true"
            className={home.status === 'PENDING' ? 'mt-0.5 shrink-0 text-warning' : 'mt-0.5 shrink-0 text-success'}
          />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-fg-subtle">Trip status</p>
            <p className="text-base font-semibold text-fg">{home.statusLabel}</p>
            {headline ? (
              <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{headline.description}</p>
            ) : (
              <p className="mt-1 text-sm text-fg-muted">No updates have been published for this trip yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {headline ? (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Latest from your organizer</CardTitle>
            <UpdateStateBadge state={headline.state} />
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <p className="text-sm font-medium text-fg">{headline.title}</p>
            <p className="whitespace-pre-wrap text-sm text-fg-muted">{headline.description}</p>
            <p className="text-xs text-fg-subtle">
              Published {new Date(headline.publishedAt).toLocaleString()}
              {headline.dayNumber ? ` · Day ${headline.dayNumber}` : ''}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <UnacknowledgedList updates={home.unacknowledged} onOpenUpdates={onOpenUpdates} />

      <NextActivityCard
        day={home.nextDay}
        onOpenItinerary={onOpenItinerary}
        currentDayNumber={trip.currentDayNumber}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base">Your organizer</CardTitle>
          <Button type="button" variant="link" size="sm" onClick={() => onOpenItinerary()}>
            Itinerary <ChevronDownIcon size={12} className="-rotate-90" aria-hidden="true" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-1 pt-0 text-sm">
          <p className="font-medium text-fg">{home.agency.agencyName}</p>
          {home.agency.contactPhone ? (
            <p>
              <a className="text-accent hover:underline" href={`tel:${home.agency.contactPhone.replace(/[^\d+]/g, '')}`}>
                {home.agency.contactPhone}
              </a>
            </p>
          ) : (
            <p className="text-fg-subtle">No phone number published</p>
          )}
          {home.agency.contactEmail ? (
            <p>
              <a className="text-accent hover:underline" href={`mailto:${home.agency.contactEmail}`}>
                {home.agency.contactEmail}
              </a>
            </p>
          ) : null}
          {home.agency.address ? <p className="text-fg-muted">{home.agency.address}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
