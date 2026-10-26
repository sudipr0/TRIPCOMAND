import type { TripStatus } from '@trailcomand/shared';

import { Badge, type BadgeVariant } from '@/components/ui/badge';

const variants: Record<TripStatus, BadgeVariant> = {
  PLANNING: 'default',
  READY: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export const tripStatusLabel = (status: TripStatus | string) =>
  status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return <Badge variant={variants[status] ?? 'default'}>{tripStatusLabel(status)}</Badge>;
}

/** Mirrors the backend lifecycle; only these transitions are offered in the UI. */
export const TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  PLANNING: ['READY', 'CANCELLED'],
  READY: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};
