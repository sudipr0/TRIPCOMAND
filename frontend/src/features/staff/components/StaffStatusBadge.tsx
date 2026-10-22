import { STAFF_STATUSES, STAFF_TYPES, type StaffStatus, type StaffType } from '@tripchange/shared';

import { Badge } from '@/components/ui/badge';

export const staffTypeLabel = (type: string) =>
  STAFF_TYPES.includes(type as StaffType) ? type.charAt(0) + type.slice(1).toLowerCase() : type;

export const staffStatusLabel = (status: string) =>
  STAFF_STATUSES.includes(status as StaffStatus)
    ? status.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
    : status;

export function StaffStatusBadge({ status }: { status: string }) {
  const variant = status === 'AVAILABLE' ? 'success' : status === 'ASSIGNED' ? 'info'
    : status === 'ON_LEAVE' ? 'warning' : 'default';
  return <Badge variant={variant}>{staffStatusLabel(status)}</Badge>;
}
