import { Badge } from '@/components/ui/badge';

const statusVariants = {
  NEW: 'info', CONTACTED: 'default', QUALIFIED: 'default', QUOTED: 'warning',
  NEGOTIATING: 'warning', WON: 'success', LOST: 'danger', DISQUALIFIED: 'default',
} as const;
const priorityVariants = { LOW: 'default', MEDIUM: 'info', HIGH: 'warning', URGENT: 'danger' } as const;

function label(value: string) { return value.charAt(0) + value.slice(1).toLowerCase(); }

export function InquiryStatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariants[status as keyof typeof statusVariants] ?? 'default'}>{label(status)}</Badge>;
}

export function InquiryPriorityBadge({ priority }: { priority: string }) {
  return <Badge variant={priorityVariants[priority as keyof typeof priorityVariants] ?? 'default'} className="border border-current">{label(priority)}</Badge>;
}
