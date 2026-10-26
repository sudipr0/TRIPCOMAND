import type { PortalUpdateState } from '@trailcomand/shared';

import { cn } from '@/lib/utils';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ClockIcon, InfoIcon, SpinnerIcon, WarningIcon } from '@/components/icons';

/**
 * The traveller never sees a raw source status. These are the only four states
 * the portal renders, and each one says plainly what the agency has and has not
 * confirmed.
 */
export const UPDATE_STATE_LABEL: Record<PortalUpdateState, string> = {
  CONFIRMED: 'Confirmed by your organizer',
  PENDING: 'Awaiting agency update',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const UPDATE_STATE_VARIANT: Record<PortalUpdateState, BadgeVariant> = {
  CONFIRMED: 'success',
  PENDING: 'warning',
  RESOLVED: 'info',
  CLOSED: 'default',
};

export function UpdateStateBadge({ state }: { state: PortalUpdateState }) {
  return <Badge variant={UPDATE_STATE_VARIANT[state]}>{UPDATE_STATE_LABEL[state]}</Badge>;
}

export function StatusPill({
  state,
  label,
  className,
}: {
  state: PortalUpdateState;
  label: string;
  className?: string;
}) {
  const tone =
    state === 'PENDING'
      ? 'border-warning/50 bg-[hsl(var(--warning)/0.10)] text-fg'
      : state === 'RESOLVED' || state === 'CLOSED'
        ? 'border-border bg-bg-subtle text-fg'
        : 'border-success/40 bg-[hsl(var(--success)/0.08)] text-fg';
  const icon =
    state === 'PENDING' ? (
      <ClockIcon size={16} weight="bold" className="text-warning" aria-hidden="true" />
    ) : state === 'RESOLVED' || state === 'CLOSED' ? (
      <InfoIcon size={16} weight="bold" className="text-fg-muted" aria-hidden="true" />
    ) : (
      <InfoIcon size={16} weight="bold" className="text-success" aria-hidden="true" />
    );

  return (
    <Card className={cn('flex items-center gap-3 px-4 py-3', tone, className)} role="status">
      {icon}
      <p className="min-w-0 text-sm font-medium">{label}</p>
    </Card>
  );
}

/** A tel: action. Renders nothing at all if there is no number to dial. */
export function CallLink({
  phone,
  label,
  description,
  variant = 'primary',
}: {
  phone: string | null | undefined;
  label: string;
  description?: string;
  variant?: 'primary' | 'secondary';
}) {
  if (!phone || !phone.trim()) return null;
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border px-4 py-3 transition-colors duration-fast',
        variant === 'primary'
          ? 'border-accent bg-accent text-accent-fg hover:bg-accent-hover'
          : 'border-border bg-bg text-fg hover:bg-bg-muted',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className={cn('block text-xs', variant === 'primary' ? 'text-accent-fg/80' : 'text-fg-muted')}>
          {description ? `${description} · ` : ''}
          {phone}
        </span>
      </span>
      <span aria-hidden="true" className="text-sm font-medium">
        Call
      </span>
    </a>
  );
}

export function OfflineNotice({
  lastSyncedAt,
  stale,
  onRetry,
  isRetrying,
}: {
  lastSyncedAt: string | null;
  stale: boolean;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <Card
      role="status"
      className="flex flex-wrap items-start gap-3 border-warning/50 bg-[hsl(var(--warning)/0.08)] px-4 py-3"
    >
      <WarningIcon size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">
          Offline Mode — showing last saved data
          {lastSyncedAt ? ` from ${new Date(lastSyncedAt).toLocaleString()}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-fg-muted">
          {stale
            ? 'This copy is out of date. Prices, times and any agency updates may have changed.'
            : 'Your organizer may have published changes since this copy was saved.'}{' '}
          Calls and messages need a connection.
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-bg px-3 text-sm font-medium text-fg transition-colors duration-fast hover:bg-bg-muted disabled:opacity-50"
      >
        {isRetrying ? <SpinnerIcon size={14} className="animate-spin" aria-hidden="true" /> : null}
        Retry
      </button>
    </Card>
  );
}

/** A small, honest "when was this from" line used under headings. */
export function SyncStamp({ syncedAt }: { syncedAt: string | null }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
      <ClockIcon size={12} aria-hidden="true" />
      {syncedAt ? `Last updated ${new Date(syncedAt).toLocaleString()}` : 'Not yet synchronised'}
    </p>
  );
}
