import { useState } from 'react';
import type { PortalUpdateItem } from '@trailcomand/shared';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckIcon, ClockIcon, ErrorIcon, SpinnerIcon } from '@/components/icons';
import { UPDATE_STATE_LABEL, UpdateStateBadge } from '@/features/portal/components/PortalPrimitives';
import { useAcknowledgeUpdate } from '@/features/portal/hooks/usePortal';

function UpdateCard({
  update,
  token,
  online,
  onAcknowledged,
}: {
  update: PortalUpdateItem;
  token: string;
  online: boolean;
  onAcknowledged: () => void;
}) {
  const acknowledge = useAcknowledgeUpdate(token);
  const [error, setError] = useState<string | null>(null);
  const acknowledged = Boolean(update.acknowledgedAt);
  const pending = acknowledge.isPending;

  async function handleAcknowledge() {
    if (acknowledged || pending) return;
    setError(null);
    try {
      await acknowledge.mutateAsync(update.id);
      onAcknowledged();
    } catch (failure) {
      // Never claim the server saved it. Say exactly what happened.
      setError(
        online
          ? 'That did not reach your organizer. Please try again.'
          : 'You are offline. This acknowledgement was not sent — connect and try again.',
      );
      void failure;
    }
  }

  return (
    <Card
      className={cn(
        update.state === 'PENDING' && 'border-warning/50',
        update.state === 'CONFIRMED' && 'border-success/40',
      )}
    >
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">{update.title}</p>
            <p className="mt-0.5 text-xs text-fg-subtle">
              <time dateTime={update.publishedAt}>{new Date(update.publishedAt).toLocaleString()}</time>
              {update.dayNumber ? ` · Day ${update.dayNumber}` : ''}
            </p>
          </div>
          <UpdateStateBadge state={update.state} />
        </div>

        <p className="whitespace-pre-wrap text-sm text-fg-muted">{update.description}</p>

        {update.state === 'PENDING' ? (
          <p className="flex items-start gap-1.5 rounded-md bg-[hsl(var(--warning)/0.08)] px-2.5 py-2 text-xs text-fg">
            <ClockIcon size={13} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            Your organizer is still working on this. Nothing is confirmed yet — details may change.
          </p>
        ) : null}

        {update.requiresAcknowledgement ? (
          acknowledged ? (
            <p className="flex items-center gap-1.5 text-sm font-medium text-success" role="status">
              <CheckIcon size={16} weight="bold" aria-hidden="true" />
              Acknowledged
              <span className="font-normal text-fg-subtle">
                · {new Date(update.acknowledgedAt!).toLocaleString()}
              </span>
            </p>
          ) : (
            <div className="space-y-1.5 pt-1">
              <Button
                type="button"
                size="sm"
                onClick={handleAcknowledge}
                disabled={pending}
                aria-busy={pending}
                aria-describedby={error ? `ack-error-${update.id}` : undefined}
              >
                {pending ? <SpinnerIcon size={14} className="animate-spin" aria-hidden="true" /> : null}
                {pending ? 'Saving…' : 'I have read this update'}
              </Button>
              {!online ? (
                <p className="text-xs text-fg-subtle">
                  You are offline: confirming will not reach your organizer until you reconnect.
                </p>
              ) : null}
            </div>
          )
        ) : null}

        {error ? (
          <p id={`ack-error-${update.id}`} role="alert" className="flex items-start gap-1.5 text-sm text-danger">
            <ErrorIcon size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function UpdatesTab({
  token,
  updates,
  online,
  onAcknowledged,
}: {
  token: string;
  updates: PortalUpdateItem[];
  online: boolean;
  onAcknowledged: () => void;
}) {
  const outstanding = updates.filter((update) => update.requiresAcknowledgement && !update.acknowledgedAt);

  if (!updates.length) {
    return (
      <EmptyState
        icon={ClockIcon}
        title="No updates yet"
        description="Updates from your organizer — route changes, weather notices and trip announcements — will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-fg">Trip updates</h2>
        {outstanding.length ? (
          <Badge variant="warning">
            {outstanding.length} awaiting your confirmation
          </Badge>
        ) : (
          <Badge variant="success">All updates read</Badge>
        )}
      </div>
      <p className="text-xs text-fg-subtle">
        Newest first. “{UPDATE_STATE_LABEL.CONFIRMED}” means your organizer has published this change;
        “{UPDATE_STATE_LABEL.PENDING}” means it is still being worked on.
      </p>
      <ul className="space-y-3">
        {updates.map((update) => (
          <li key={update.id}>
            <UpdateCard update={update} token={token} online={online} onAcknowledged={onAcknowledged} />
          </li>
        ))}
      </ul>
    </div>
  );
}
