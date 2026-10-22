import type { StaffAssignmentStatus } from '@tripchange/shared';

import { Badge, type BadgeVariant } from '@/components/ui/badge';

const variants: Record<string, BadgeVariant> = {
  PROPOSED: 'default',
  CONFIRMED: 'success',
  DECLINED: 'danger',
  CANCELLED: 'default',
  COMPLETED: 'info',
};

export const assignmentStatusLabel = (status: string) =>
  status.charAt(0) + status.slice(1).toLowerCase();

export function AssignmentStatusBadge({ status }: { status: string }) {
  return <Badge variant={variants[status] ?? 'default'}>{assignmentStatusLabel(status)}</Badge>;
}

/** Mirrors the backend lifecycle for staff and resource assignments. */
export const ASSIGNMENT_TRANSITIONS: Record<StaffAssignmentStatus, StaffAssignmentStatus[]> = {
  PROPOSED: ['CONFIRMED', 'DECLINED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED'],
  DECLINED: [],
  CANCELLED: [],
  COMPLETED: [],
};

/** Resource assignments have no DECLINED state (backend enum). */
export const RESOURCE_ASSIGNMENT_TRANSITIONS: Record<string, string[]> = {
  PROPOSED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CANCELLED', 'COMPLETED'],
  CANCELLED: [],
  COMPLETED: [],
};
