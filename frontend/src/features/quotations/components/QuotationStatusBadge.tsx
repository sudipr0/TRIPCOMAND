import { Badge } from '@/components/ui/badge';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const quotationStatusVariants: Record<string, Variant> = {
  DRAFT: 'default',
  SENT: 'info',
  VIEWED: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'warning',
  REVISED: 'warning',
};

export const quotationStatusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  REVISED: 'Revised',
};

export function QuotationStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={quotationStatusVariants[status] ?? 'default'}>
      {quotationStatusLabels[status] ?? status}
    </Badge>
  );
}
