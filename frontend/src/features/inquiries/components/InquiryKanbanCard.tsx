import type { InquiryDetail, MemberDetail } from '@tripchange/shared';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { InquiryPriorityBadge } from '@/features/inquiries/components/InquiryBadges';
import { daysSince, getInitials } from '@/lib/utils';

export function InquiryKanbanCard({ inquiry, customerName, member }: {
  inquiry: InquiryDetail; customerName?: string; member?: MemberDetail;
}) {
  const name = member ? `${member.user.firstName} ${member.user.lastName}`.trim() : '';
  const age = daysSince(inquiry.createdAt);
  return <Link to={`/inquiries/${inquiry.id}`} className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" aria-label={`View ${inquiry.inquiryNumber}, ${customerName ?? 'customer unavailable'}`}>
    <Card className="space-y-3 border p-4 shadow-xs transition-[transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:shadow-sm">
      <p className="text-sm font-semibold text-fg">{inquiry.inquiryNumber}</p>
      <div>
        <p className="text-sm font-medium text-fg">{customerName ?? '—'}</p>
        <p className="line-clamp-1 text-sm text-fg-muted">{inquiry.trekInterest || inquiry.destinationText || '—'}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2"><InquiryPriorityBadge priority={inquiry.priority} />
        <span className="text-xs text-fg-muted">{age === 0 ? 'Today' : `${age} ${age === 1 ? 'day' : 'days'} ago`}</span></div>
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        {name ? <Avatar className="size-6"><AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback></Avatar> : null}
        {name || (inquiry.assignedToId ? 'Member unavailable' : 'Unassigned')}
      </div>
    </Card>
  </Link>;
}
