import { PERMISSION_CODES, type InquiryDetail } from '@tripchange/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EditIcon, MoreIcon, QuotationIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AssignInquiryDialog } from '@/features/inquiries/components/AssignInquiryDialog';
import { InquiryFormDialog } from '@/features/inquiries/components/InquiryFormDialog';
import { MarkLostDialog } from '@/features/inquiries/components/MarkLostDialog';
import { useDeleteInquiry, useUpdateInquiry } from '@/features/inquiries/hooks/useInquiries';
import { QuotationFormDialog } from '@/features/quotations/components/QuotationFormDialog';
import { useWorkspaceStore } from '@/stores/workspace.store';

type Action = 'edit' | 'assign' | 'quotation' | 'won' | 'lost' | 'delete' | null;
/** Negotiation can be reopened; WON/LOST/DISQUALIFIED cannot start a new proposal. */
export const quotationEligible = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'NEGOTIATING']);
const terminal = new Set(['WON', 'LOST', 'DISQUALIFIED']);

export function InquiryActionsMenu({ inquiry, showView = true, onDeleted }: {
  inquiry: InquiryDetail; showView?: boolean; onDeleted?: () => void;
}) {
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.INQUIRY_UPDATE));
  const canQuote = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.QUOTATION_CREATE));
  const [action, setAction] = useState<Action>(null);
  const [error, setError] = useState(false);
  const update = useUpdateInquiry(inquiry.id);
  const remove = useDeleteInquiry();
  const pending = update.isPending || remove.isPending;
  const confirming = action === 'won' || action === 'delete';
  const hasQuotation = canQuote && quotationEligible.has(inquiry.status);

  async function confirm() {
    if (pending) return;
    setError(false);
    try {
      if (action === 'won') await update.mutateAsync({ status: 'WON' });
      if (action === 'delete') { await remove.mutateAsync(inquiry.id); onDeleted?.(); }
      setAction(null);
    } catch { setError(true); }
  }

  return <>
    {showView || canUpdate || hasQuotation ? <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${inquiry.inquiryNumber}`}><MoreIcon size={18} /><span className="sr-only">Actions</span></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showView ? <DropdownMenuItem asChild><Link to={`/inquiries/${inquiry.id}`}>View</Link></DropdownMenuItem> : null}
        {canUpdate ? <><DropdownMenuItem onSelect={() => setAction('edit')}><EditIcon size={16} />Edit</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAction('assign')}>Assign</DropdownMenuItem></> : null}
        {hasQuotation ? <DropdownMenuItem onSelect={() => setAction('quotation')}><QuotationIcon size={16} />Create quotation</DropdownMenuItem> : null}
        {canUpdate && !terminal.has(inquiry.status) ? <><DropdownMenuItem onSelect={() => setAction('won')}>Mark won</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAction('lost')}>Mark lost</DropdownMenuItem></> : null}
        {canUpdate ? <><DropdownMenuSeparator /><DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setAction('delete')}>Delete</DropdownMenuItem></> : null}
      </DropdownMenuContent>
    </DropdownMenu> : null}
    {action === 'edit' ? <InquiryFormDialog inquiry={inquiry} open onOpenChange={(next) => { if (!next) setAction(null); }}
      trigger={<button type="button" tabIndex={-1} className="sr-only">Edit inquiry</button>} /> : null}
    {action === 'assign' ? <AssignInquiryDialog inquiryId={inquiry.id} assignedToId={inquiry.assignedToId} open onOpenChange={(next) => { if (!next) setAction(null); }} /> : null}
    {action === 'lost' ? <MarkLostDialog inquiryId={inquiry.id} open onOpenChange={(next) => { if (!next) setAction(null); }} /> : null}
    {action === 'quotation' ? <QuotationFormDialog key={`quotation-${inquiry.id}`} open inquiry={inquiry} onOpenChange={(next) => { if (!next) setAction(null); }} /> : null}
    <Dialog open={confirming} onOpenChange={(next) => { if (!next && !pending) { setAction(null); setError(false); } }}>
      <DialogContent><DialogHeader><DialogTitle>{action === 'won' ? 'Mark inquiry won?' : 'Delete inquiry?'}</DialogTitle>
        <DialogDescription>{action === 'won' ? 'Set the inquiry outcome to WON.' : `Delete ${inquiry.inquiryNumber}? It will no longer appear in the pipeline.`}</DialogDescription></DialogHeader>
        {error ? <p role="alert" className="text-sm text-danger">Could not complete the action. Please try again.</p> : null}
        <DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={() => { setAction(null); setError(false); }}>Cancel</Button>
          <Button type="button" variant={action === 'delete' ? 'danger' : 'primary'} disabled={pending} onClick={() => void confirm()}>
            {pending ? 'Saving...' : action === 'won' ? 'Mark won' : 'Delete inquiry'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
