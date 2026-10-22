import { Badge } from '@/components/ui/badge';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const bookingStatusVariants: Record<string, Variant> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  IN_PROGRESS: 'info',
  COMPLETED: 'default',
  CANCELLED: 'danger',
  REFUNDED: 'default',
};

const paymentTypeVariants: Record<string, Variant> = {
  DEPOSIT: 'info',
  INSTALLMENT: 'default',
  FINAL_PAYMENT: 'success',
  REFUND: 'danger',
  ADJUSTMENT: 'warning',
};

export const bookingStatusLabels: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const paymentTypeLabels: Record<string, string> = {
  DEPOSIT: 'Deposit',
  INSTALLMENT: 'Installment',
  FINAL_PAYMENT: 'Final payment',
  REFUND: 'Refund',
  ADJUSTMENT: 'Adjustment',
};

export function BookingStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={bookingStatusVariants[status] ?? 'default'}>
      {bookingStatusLabels[status] ?? status}
    </Badge>
  );
}

export function PaymentTypeBadge({ paymentType }: { paymentType: string }) {
  return (
    <Badge variant={paymentTypeVariants[paymentType] ?? 'default'}>
      {paymentTypeLabels[paymentType] ?? paymentType}
    </Badge>
  );
}
