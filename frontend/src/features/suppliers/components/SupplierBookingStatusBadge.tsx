import { Badge, type BadgeVariant } from '@/components/ui/badge';

const variants: Record<string, BadgeVariant> = {
  INQUIRY: 'default',
  REQUESTED: 'info',
  QUOTED: 'warning',
  BOOKED: 'info',
  CONFIRMED: 'success',
  IN_PROGRESS: 'warning',
  COMPLETED: 'default',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
};

export const supplierBookingStatusLabel = (status: string) =>
  status.replace(/_/g, ' ').charAt(0) + status.replace(/_/g, ' ').slice(1).toLowerCase();

export function SupplierBookingStatusBadge({ status }: { status: string }) {
  return <Badge variant={variants[status] ?? 'default'}>{supplierBookingStatusLabel(status)}</Badge>;
}

/**
 * Mirrors the backend transition rules exactly. Any action not listed here is rejected
 * by the service, so the UI must never offer it.
 */
export interface SupplierBookingActions {
  requestQuote: boolean;
  recordQuote: boolean;
  confirm: boolean;
  markInProgress: boolean;
  complete: boolean;
  recordActualCost: boolean;
  markNoShow: boolean;
  cancel: boolean;
  remove: boolean;
}

export function supplierBookingActions(status: string, hasActualCost: boolean): SupplierBookingActions {
  return {
    requestQuote: status === 'INQUIRY',
    recordQuote: status === 'REQUESTED',
    confirm: status === 'QUOTED' || status === 'BOOKED',
    markInProgress: status === 'CONFIRMED',
    complete: status === 'IN_PROGRESS',
    recordActualCost: (status === 'IN_PROGRESS' || status === 'COMPLETED') && !hasActualCost,
    markNoShow: status === 'CONFIRMED' || status === 'IN_PROGRESS',
    cancel: !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(status),
    remove: status === 'CANCELLED' || status === 'NO_SHOW',
  };
}
