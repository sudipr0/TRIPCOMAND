import { differenceInCalendarDays, format } from 'date-fns';

import { Badge } from '@/components/ui/badge';

/**
 * Colour tracks urgency: more than a week out is informational, inside a week is a
 * warning, inside three days is urgent, and a past deadline stays loud so it is not missed.
 */
export function DeadlineBadge({ deadline }: { deadline: string | null | undefined }) {
  if (!deadline) return null;
  const target = new Date(deadline);
  if (Number.isNaN(target.getTime())) return null;
  const days = differenceInCalendarDays(target, new Date());

  if (days < 0) return <Badge variant="danger" title={`Deadline was ${format(target, 'dd MMM yyyy')}`}>Passed</Badge>;
  if (days === 0) return <Badge variant="danger" title={format(target, 'dd MMM yyyy')}>Due today</Badge>;
  if (days < 3) return <Badge variant="danger">{days} {days === 1 ? 'day' : 'days'} left</Badge>;
  if (days <= 7) return <Badge variant="warning">{days} days left</Badge>;
  return <Badge title={`Deadline ${format(target, 'dd MMM yyyy')}`}>{days} days left</Badge>;
}
