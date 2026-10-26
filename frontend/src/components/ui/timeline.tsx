import type { InquiryActivityDetail } from '@trailcomand/shared';

import { cn, formatRelative } from '@/lib/utils';

export type TimelineActivity = Pick<
  InquiryActivityDetail,
  'activityType' | 'description' | 'createdAt' | 'userId'
> & { id?: string };

export interface TimelineProps {
  activities: readonly TimelineActivity[];
  getActorName?: (userId: string) => string | undefined;
  className?: string;
}

function dotClass(activityType: string) {
  if (activityType === 'inquiry.updated') return 'bg-warning';

  switch (activityType.split('.')[0]) {
    case 'call':
    case 'meeting':
      return 'bg-accent';
    case 'email':
      return 'bg-info';
    case 'whatsapp':
      return 'bg-success';
    default:
      return 'bg-bg-muted';
  }
}

export function Timeline({ activities, getActorName, className }: TimelineProps) {
  return (
    <ol className={cn('ml-1 space-y-4 border-l border-border', className)}>
      {activities.map((activity, index) => {
        const actorName = activity.userId ? getActorName?.(activity.userId) : undefined;

        return (
          <li key={activity.id ?? `${activity.createdAt}-${index}`} className="relative ml-5">
            <span
              aria-hidden="true"
              className={cn('absolute -left-6 top-1 h-2 w-2 rounded-full', dotClass(activity.activityType))}
            />
            <p className="text-sm text-fg">{activity.description}</p>
            <p className="mt-1 text-xs text-fg-subtle">
              {actorName ? `${actorName} · ` : null}
              <time dateTime={activity.createdAt}>{formatRelative(activity.createdAt)}</time>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
