import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { DeleteIcon, EditIcon, MoreIcon, SendIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { QuotationDetail } from '@trailcomand/shared';
import { ConvertQuotationDialog } from '@/features/quotations/components/ConvertQuotationDialog';
import { QuotationFormDialog } from '@/features/quotations/components/QuotationFormDialog';
import { RejectQuotationDialog } from '@/features/quotations/components/RejectQuotationDialog';
import { useAcceptQuotation, useDeleteQuotation, useSendQuotation } from '@/features/quotations/hooks/useQuotations';

export type QuotationAction = 'edit' | 'send' | 'accept' | 'convert' | 'delete' | null;

export interface QuotationActionsMenuProps {
  quotation: QuotationDetail;
  /** Detail pages already show "View" via the header; hide it there. */
  showView?: boolean;
  onDeleted?: () => void;
  /** Controlled mode, used by the detail page's primary header buttons. */
  action?: QuotationAction;
  onActionChange?: (action: QuotationAction) => void;
}

/** Row/detail action menu. External controlled state lets the detail header open the same flows. */
export function QuotationActionsMenu({ quotation, showView = true, onDeleted, action: controlledAction, onActionChange }: QuotationActionsMenuProps) {
  const navigate = useNavigate();
  const [internalAction, setInternalAction] = useState<QuotationAction>(null);
  const action = controlledAction !== undefined ? controlledAction : internalAction;
  const [rejectOpen, setRejectOpen] = useState(false);
  const send = useSendQuotation(quotation.id);
  const accept = useAcceptQuotation(quotation.id);
  const remove = useDeleteQuotation();
  const pending = send.isPending || accept.isPending || remove.isPending;

  function setAction(next: QuotationAction) {
    if (onActionChange) onActionChange(next);
    else setInternalAction(next);
  }

  const isDraft = quotation.status === 'DRAFT';
  const isSent = quotation.status === 'SENT' || quotation.status === 'VIEWED';
  const isAccepted = quotation.status === 'ACCEPTED';
  const converted = Boolean(quotation.convertedToBookingId);
  const hasMenu = showView || isDraft || isSent || isAccepted;

  return (
    <>
      {hasMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${quotation.quotationNumber}`}>
              <MoreIcon size={18} /><span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {showView ? <DropdownMenuItem asChild><Link to={`/quotations/${quotation.id}`}>View</Link></DropdownMenuItem> : null}
            {isDraft ? <DropdownMenuItem onSelect={() => setAction('edit')}><EditIcon size={16} />Edit</DropdownMenuItem> : null}
            {isDraft ? <DropdownMenuItem onSelect={() => setAction('send')}><SendIcon size={16} />Send</DropdownMenuItem> : null}
            {isSent ? <DropdownMenuItem onSelect={() => setAction('accept')}>Accept</DropdownMenuItem> : null}
            {isSent ? <DropdownMenuItem onSelect={() => setRejectOpen(true)}>Reject</DropdownMenuItem> : null}
            {isAccepted && !converted ? <DropdownMenuItem onSelect={() => setAction('convert')}>Convert to booking</DropdownMenuItem> : null}
            {isAccepted && converted ? <DropdownMenuItem asChild><Link to={`/bookings/${quotation.convertedToBookingId}`}>View booking</Link></DropdownMenuItem> : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setAction('delete')}><DeleteIcon size={16} />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {action === 'edit' ? (
        <QuotationFormDialog key={quotation.id} open quotation={quotation} onOpenChange={(next) => { if (!next) setAction(null); }} />
      ) : null}
      {action === 'convert' ? (
        <ConvertQuotationDialog open quotation={quotation} onOpenChange={(next) => { if (!next) setAction(null); }} />
      ) : null}
      <RejectQuotationDialog open={rejectOpen} quotationId={quotation.id} quotationNumber={quotation.quotationNumber}
        onOpenChange={setRejectOpen} />

      <Dialog open={action === 'send' || action === 'accept' || action === 'delete'}
        onOpenChange={(next) => { if (!next && !pending) setAction(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action === 'send' ? 'Send quotation?' : action === 'accept' ? 'Accept quotation?' : 'Delete quotation?'}</DialogTitle>
            <DialogDescription>
              {action === 'send' ? `Send ${quotation.quotationNumber} to ${quotation.customer?.fullName ?? 'the customer'}? It becomes read-only until revised.`
                : action === 'accept' ? `Mark ${quotation.quotationNumber} as accepted? You can convert it to a booking afterwards.`
                  : `Delete ${quotation.quotationNumber}? It will no longer appear in the quotations list.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setAction(null)}>Cancel</Button>
            <Button type="button" variant={action === 'delete' ? 'danger' : 'primary'} disabled={pending}
              onClick={() => {
                if (action === 'send') send.mutate(undefined, { onSuccess: () => setAction(null) });
                if (action === 'accept') accept.mutate(undefined, { onSuccess: () => setAction(null) });
                if (action === 'delete') {
                  remove.mutate(quotation.id, { onSuccess: () => { setAction(null); if (onDeleted) onDeleted(); else navigate('/quotations'); } });
                }
              }}>
              {pending ? 'Saving...' : action === 'send' ? 'Send quotation' : action === 'accept' ? 'Accept quotation' : 'Delete quotation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

