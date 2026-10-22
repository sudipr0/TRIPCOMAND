import { Badge } from '@/components/ui/badge';
import { formatDateRange } from '@/lib/utils';
import { ErrorIcon, WarningIcon, SuccessIcon } from '@/components/icons';

export interface ConflictItem {
  id?: string;
  tripId?: string;
  tripName: string;
  startDate: string;
  endDate: string;
  status: string;
}

/**
 * Shown wherever an assignment would overlap an existing one. Always visible before submit —
 * the backend returns the same summaries on a 409, so both paths render identically.
 */
export function ConflictBanner({ title = 'Assignment conflict', subject, conflicts }: {
  title?: string;
  subject?: string;
  conflicts: ConflictItem[];
}) {
  return (
    <div role="alert" className="rounded-md border border-danger bg-bg-subtle px-3 py-2.5">
      <p className="flex items-center gap-2 text-sm font-medium text-danger">
        <ErrorIcon size={16} aria-hidden="true" />
        {title}
      </p>
      {subject ? <p className="mt-1 text-xs text-danger">{subject}</p> : null}
      {conflicts.length ? (
        <ul className="mt-2 space-y-1.5">
          {conflicts.map((conflict) => (
            <li
              key={conflict.id ?? `${conflict.tripName}-${conflict.startDate}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm bg-bg px-2 py-1.5"
            >
              <span className="min-w-0 truncate text-xs font-medium text-fg">{conflict.tripName}</span>
              <span className="shrink-0 text-xs tabular-nums text-fg-muted">{formatDateRange(conflict.startDate, conflict.endDate)}</span>
              <Badge>{conflict.status.charAt(0) + conflict.status.slice(1).toLowerCase()}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-xs text-danger">Choose different dates or cancel the existing assignment.</p>
    </div>
  );
}

export function AvailabilityBanner({ available, subject, detail }: { available: boolean; subject: string; detail?: string }) {
  return (
    <div className={`rounded-md border bg-bg-subtle px-3 py-2.5 ${available ? 'border-success' : 'border-danger'}`}>
      <p className={`flex items-center gap-2 text-sm font-medium ${available ? 'text-success' : 'text-danger'}`}>
        {available ? <SuccessIcon size={16} aria-hidden="true" /> : <WarningIcon size={16} aria-hidden="true" />}
        {subject} is {available ? 'available' : 'not available'}
      </p>
      {detail ? <p className={`mt-1 text-xs ${available ? 'text-success' : 'text-danger'}`}>{detail}</p> : null}
    </div>
  );
}
