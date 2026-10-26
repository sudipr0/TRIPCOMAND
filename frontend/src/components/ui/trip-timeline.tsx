import type { DayStatusValue } from '@trailcomand/shared';

import { cn } from '@/lib/utils';
import { BedIcon, CheckIcon, MapPinIcon, MountainsIcon, WalkingIcon, WarningIcon, ErrorIcon, ClockIcon } from '@/components/icons';

/** The fields the timeline needs. Both the office and portal day shapes satisfy this. */
export interface TimelineDay {
  id: string;
  dayNumber: number;
  title: string;
  description?: string | null;
  location?: string | null;
  altitude?: number | null;
  walkingHours?: string | null;
  accommodation?: string | null;
  status: DayStatusValue;
}

const STATUS_LABEL: Record<DayStatusValue, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  DELAYED: 'Delayed',
  PROBLEM: 'Problem',
};

/**
 * Each status gets a card treatment and a dot treatment. Colours use the app's
 * semantic tokens (success/warning/danger) so light and dark mode both work, and
 * nothing introduces a new hue outside the palette.
 */
const CARD_STYLES: Record<DayStatusValue, string> = {
  PENDING: 'border-border bg-bg',
  IN_PROGRESS: 'border-success/50 bg-[hsl(var(--success)/0.06)]',
  COMPLETED: 'border-success/40 bg-[hsl(var(--success)/0.10)]',
  DELAYED: 'border-warning/50 bg-[hsl(var(--warning)/0.10)]',
  PROBLEM: 'border-danger/50 bg-[hsl(var(--danger)/0.08)]',
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

function StatusIcon({ status }: { status: DayStatusValue }) {
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

function DayMeta({ day }: { day: TimelineDay }) {
  const parts = [
    day.location ? { icon: <MapPinIcon size={13} />, text: day.location } : null,
    day.altitude !== null && day.altitude !== undefined ? { icon: <MountainsIcon size={13} />, text: `${day.altitude} m` } : null,
    day.walkingHours ? { icon: <WalkingIcon size={13} />, text: `${day.walkingHours} h` } : null,
    day.accommodation ? { icon: <BedIcon size={13} />, text: day.accommodation } : null,
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  if (!parts.length) return null;
  return (
    <div className="mt-1.5 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-muted">
      {parts.map((part, index) => (
        <span key={`${part.text}-${index}`} className="inline-flex items-center gap-1">
          {part.icon}
          {part.text}
        </span>
      ))}
    </div>
  );
}

/**
 * Vertical stepper of trip days, package-tracker style: a dot and connecting
 * line on the left, the day's content on the right. The line above the current
 * day is green (days already behind us); below it stays neutral.
 *
 * `renderDayAction` lets the office hang a status control off each row without
 * the portal having to know anything about permissions.
 */
export function TripTimeline({
  days,
  renderDayAction,
  className,
}: {
  days: TimelineDay[];
  renderDayAction?: (day: TimelineDay) => React.ReactNode;
  className?: string;
}) {
  if (!days.length) return null;

  return (
    <ol className={cn('space-y-0', className)} aria-label="Trip timeline">
      {days.map((day, index) => {
        const isLast = index === days.length - 1;
        const status = day.status;
        return (
          <li key={day.id} className="relative flex gap-4 pb-4 last:pb-0">
            {/* Rail: dot + connector. */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                  DOT_STYLES[status],
                  status === 'IN_PROGRESS' && 'animate-pulse',
                )}
                aria-hidden="true"
              >
                <StatusIcon status={status} />
              </span>
              {!isLast ? (
                <span
                  className={cn(
                    'w-0.5 flex-1',
                    status === 'COMPLETED' || status === 'IN_PROGRESS' ? 'bg-[hsl(var(--success)/0.45)]' : 'bg-border',
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </div>

            {/* Content. */}
            <div className={cn('min-w-0 flex-1 rounded-lg border px-4 py-3', CARD_STYLES[status])}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-fg-subtle">
                    Day {day.dayNumber}
                    <span className={cn('ml-2 inline-flex items-center gap-1 font-medium normal-case tracking-normal', LABEL_STYLES[status])}>
                      {STATUS_LABEL[status]}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-fg">{day.title}</p>
                </div>
                {renderDayAction ? <div className="shrink-0">{renderDayAction(day)}</div> : null}
              </div>
              <DayMeta day={day} />
              {day.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{day.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export { STATUS_LABEL as DAY_STATUS_LABEL };
