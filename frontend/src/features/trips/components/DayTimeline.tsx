import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface DayTimelineItem {
  id: string;
  dayNumber: number;
  content: ReactNode;
}

/**
 * Vertical itinerary timeline: a numbered circle per day with a connecting rule.
 * The accent tone marks days that fall on or after today, so operations can glance at where the trip is.
 */
export function DayTimeline({ items, highlight }: { items: DayTimelineItem[]; highlight?: (item: DayTimelineItem) => boolean }) {
  return (
    <ol className="space-y-0">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        const active = highlight?.(item) ?? false;
        return (
          <li key={item.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                  active ? 'bg-accent-subtle text-accent' : 'bg-bg-subtle text-fg',
                )}
              >
                {item.dayNumber}
              </span>
              {!last ? <span aria-hidden="true" className="mt-1 w-0.5 flex-1 bg-border" /> : null}
            </div>
            <div className={cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-5')}>{item.content}</div>
          </li>
        );
      })}
    </ol>
  );
}
