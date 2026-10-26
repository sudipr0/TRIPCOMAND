import { useId, useState } from 'react';
import type { DayStatusValue, PortalItineraryDay } from '@trailcomand/shared';

import { cn, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  BedIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  ErrorIcon,
  MapPinIcon,
  MountainsIcon,
  WalkingIcon,
  WarningIcon,
} from '@/components/icons';
import { UPDATE_STATE_LABEL } from '@/features/portal/components/PortalPrimitives';

const STATUS_LABEL: Record<DayStatusValue, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  DELAYED: 'Delayed',
  PROBLEM: 'Needs attention',
};

const CARD_STYLES: Record<DayStatusValue, string> = {
  PENDING: 'border-border bg-bg',
  IN_PROGRESS: 'border-success/50 bg-[hsl(var(--success)/0.06)]',
  COMPLETED: 'border-success/40 bg-[hsl(var(--success)/0.08)]',
  DELAYED: 'border-warning/50 bg-[hsl(var(--warning)/0.08)]',
  PROBLEM: 'border-danger/50 bg-[hsl(var(--danger)/0.06)]',
};

const DOT_STYLES: Record<DayStatusValue, string> = {
  PENDING: 'border-border bg-bg text-fg-subtle',
  IN_PROGRESS: 'border-success bg-[hsl(var(--success)/0.18)] text-success',
  COMPLETED: 'border-success bg-success text-accent-fg',
  DELAYED: 'border-warning bg-[hsl(var(--warning)/0.2)] text-warning',
  PROBLEM: 'border-danger bg-[hsl(var(--danger)/0.18)] text-danger',
};

const LABEL_STYLES: Record<DayStatusValue, string> = {
  PENDING: 'text-fg-subtle',
  IN_PROGRESS: 'text-success',
  COMPLETED: 'text-success',
  DELAYED: 'text-warning',
  PROBLEM: 'text-danger',
};

const MEAL_LABEL: Record<string, string> = {
  BREAKFAST: 'Breakfast',
  LUNCH: 'Lunch',
  DINNER: 'Dinner',
};

function StatusDot({ status }: { status: DayStatusValue }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckIcon size={14} weight="bold" aria-hidden="true" />;
    case 'IN_PROGRESS':
      return <ClockIcon size={14} aria-hidden="true" />;
    case 'DELAYED':
      return <WarningIcon size={14} aria-hidden="true" />;
    case 'PROBLEM':
      return <ErrorIcon size={14} aria-hidden="true" />;
    default:
      return <span className="block h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />;
  }
}

/** Human-readable distance: "7.8 km". Never renders a placeholder for missing data. */
function distanceLabel(value: string | null): string | null {
  const parsed = value === null ? Number.NaN : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return `${parsed.toFixed(1)} km`;
}

function gainLabel(value: number | null): string | null {
  if (value === null) return null;
  if (value === 0) return 'Flat';
  return value > 0 ? `+${value} m ascent` : `${Math.abs(value)} m descent`;
}

function walkingLabel(value: string | null): string | null {
  if (!value) return null;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h walking`;
}

/** The compact meta row: three facts at most, so the card stays scannable on a phone. */
function CollapsedMeta({ day }: { day: PortalItineraryDay }) {
  const route =
    day.startLocation && day.endLocation
      ? day.startLocation === day.endLocation
        ? day.startLocation
        : `${day.startLocation} → ${day.endLocation}`
      : (day.endLocation ?? day.startLocation ?? day.location);

  const facts = [day.altitude !== null ? `${day.altitude.toLocaleString()} m` : null, walkingLabel(day.walkingHours)].filter(
    Boolean,
  ) as string[];

  return (
    <div className="mt-1.5 space-y-1">
      {route ? (
        <p className="flex items-start gap-1.5 text-xs text-fg-muted">
          <MapPinIcon size={13} className="mt-px shrink-0" aria-hidden="true" />
          <span className="min-w-0">{route}</span>
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
        {facts.map((fact) => (
          <span key={fact} className="inline-flex items-center gap-1">
            {fact.endsWith('m') ? <MountainsIcon size={13} aria-hidden="true" /> : null}
            {fact === walkingLabel(day.walkingHours) ? <WalkingIcon size={13} aria-hidden="true" /> : null}
            {fact}
          </span>
        ))}
        {day.accommodation ? (
          <span className="inline-flex items-center gap-1">
            <BedIcon size={13} aria-hidden="true" />
            {day.accommodation}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-fg-subtle">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-fg">{value}</dd>
    </div>
  );
}

export function PortalDayCard({ day, isLast }: { day: PortalItineraryDay; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const status = day.status;
  const distance = distanceLabel(day.distanceKm);
  const gain = gainLabel(day.elevationGain);
  const walking = walkingLabel(day.walkingHours);
  const meals = day.meals.map((meal) => MEAL_LABEL[meal.toUpperCase()] ?? meal);

  const details: Array<{ icon: React.ReactNode; label: string; value: string }> = [
    ...(distance ? [{ icon: <WalkingIcon size={12} />, label: 'Distance', value: distance }] : []),
    ...(gain ? [{ icon: <MountainsIcon size={12} />, label: 'Elevation', value: gain }] : []),
    ...(walking ? [{ icon: <ClockIcon size={12} />, label: 'Walking', value: walking }] : []),
    ...(day.altitude !== null
      ? [{ icon: <MountainsIcon size={12} />, label: 'Sleeping altitude', value: `${day.altitude.toLocaleString()} m` }]
      : []),
    ...(day.accommodation
      ? [{ icon: <BedIcon size={12} />, label: 'Accommodation', value: day.accommodation }]
      : []),
    ...(meals.length ? [{ icon: <ClockIcon size={12} />, label: 'Included meals', value: meals.join(' · ') }] : []),
    ...(day.startTime || day.endTime
      ? [
          {
            icon: <ClockIcon size={12} />,
            label: 'Time',
            value: [day.startTime, day.endTime].filter(Boolean).join(' – '),
          },
        ]
      : []),
  ];

  return (
    <li className="relative flex gap-3 pb-3 last:pb-0 sm:gap-4">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
            DOT_STYLES[status],
            status === 'IN_PROGRESS' && 'animate-pulse',
          )}
          aria-hidden="true"
        >
          <StatusDot status={status} />
        </span>
        {!isLast ? (
          <span
            className={cn(
              'w-0.5 flex-1',
              status === 'COMPLETED' || status === 'IN_PROGRESS'
                ? 'bg-[hsl(var(--success)/0.45)]'
                : 'bg-border',
            )}
            aria-hidden="true"
          />
        ) : null}
      </div>

      <div className={cn('min-w-0 flex-1 rounded-lg border px-3 py-3 sm:px-4', CARD_STYLES[status])}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-start justify-between gap-2 text-left"
        >
          <span className="min-w-0">
            <span className="block text-xs uppercase tracking-wide text-fg-subtle">
              Day {day.dayNumber}
              {day.date ? <span className="normal-case tracking-normal"> · {formatDate(day.date)}</span> : null}
              <span className={cn('ml-2 font-medium', LABEL_STYLES[status])}>{STATUS_LABEL[status]}</span>
            </span>
            <span className="mt-0.5 block text-sm font-medium text-fg">{day.title}</span>
          </span>
          <ChevronDownIcon
            size={16}
            aria-hidden="true"
            className={cn('mt-1 shrink-0 text-fg-subtle transition-transform duration-fast', open && 'rotate-180')}
          />
        </button>

        <CollapsedMeta day={day} />

        {day.changeNotice ? (
          <p className="mt-2 rounded-md border border-warning/40 bg-[hsl(var(--warning)/0.10)] px-2.5 py-1.5 text-xs text-fg">
            <span className="font-medium">
              {day.changeNotice.state === 'CONFIRMED'
                ? 'Change published by your organizer'
                : UPDATE_STATE_LABEL[day.changeNotice.state]}
              :
            </span>{' '}
            {day.changeNotice.summary}
          </p>
        ) : null}

        <div id={panelId} hidden={!open} className="mt-3 space-y-3 border-t border-border/70 pt-3">
          {day.description ? (
            <p className="whitespace-pre-wrap text-sm text-fg-muted">{day.description}</p>
          ) : (
            <p className="text-sm text-fg-subtle">No further description was published for this day.</p>
          )}

          {day.activities.length ? (
            <div className="flex flex-wrap gap-1.5">
              {day.activities.map((activity) => (
                <Badge key={activity} variant="default">
                  {activity}
                </Badge>
              ))}
            </div>
          ) : null}

          {details.length ? (
            <dl className="grid grid-cols-2 gap-3">
              {details.map((detail) => (
                <Fact key={detail.label} icon={detail.icon} label={detail.label} value={detail.value} />
              ))}
            </dl>
          ) : (
            <p className="text-xs text-fg-subtle">
              Your organizer has not published distance, elevation or accommodation details for this day.
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function PortalTimeline({ days }: { days: PortalItineraryDay[] }) {
  if (!days.length) return null;
  return (
    <ol className="space-y-0" aria-label="Trip itinerary">
      {days.map((day, index) => (
        <PortalDayCard key={day.id} day={day} isLast={index === days.length - 1} />
      ))}
    </ol>
  );
}
