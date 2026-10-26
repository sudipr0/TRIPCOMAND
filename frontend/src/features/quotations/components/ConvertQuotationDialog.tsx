import type { QuotationDetail } from '@trailcomand/shared';
import { useNavigate } from 'react-router-dom';

import { InfoIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useConvertQuotation } from '@/features/quotations/hooks/useQuotations';
import { formatCurrency, formatDateRange } from '@/lib/utils';

export interface ConvertQuotationDialogProps {
  quotation: QuotationDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Converts an ACCEPTED quotation into a booking + trip. The backend also moves the linked
 * inquiry to WON, so this is the terminal step of the inquiry → quotation → booking flow.
 */
export function ConvertQuotationDialog({ quotation, open, onOpenChange }: ConvertQuotationDialogProps) {
  const navigate = useNavigate();
  const convert = useConvertQuotation(quotation.id);
  const customerName = quotation.customer?.fullName ?? 'this customer';

  function submit() {
    convert.mutate(undefined, {
      onSuccess: (result) => {
        onOpenChange(false);
        navigate(`/bookings/${result.booking.id}`);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!convert.isPending) onOpenChange(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to booking?</DialogTitle>
          <DialogDescription>
            This will create a booking and a trip for {customerName}. The quotation becomes read-only
            and the linked inquiry is marked won.
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-2 rounded-md border border-border bg-bg-subtle px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-fg-muted">Customer</dt>
            <dd className="truncate font-medium text-fg">{customerName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-fg-muted">Trek</dt>
            <dd className="truncate font-medium text-fg">{quotation.trekName}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-fg-muted">Dates</dt>
            <dd className="tabular-nums text-fg">{formatDateRange(quotation.startDate, quotation.endDate)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-fg-muted">Total</dt>
            <dd className="font-semibold tabular-nums text-fg">{formatCurrency(quotation.total, quotation.currency)}</dd>
          </div>
        </dl>
        <p className="flex items-start gap-2 text-xs text-fg-muted">
          <InfoIcon size={16} />
          A trip skeleton is created from the quotation dates and group size. Check for overlapping trips for this
          customer before converting.
        </p>
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={convert.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={convert.isPending} onClick={submit}>
            {convert.isPending ? 'Converting...' : 'Convert to booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
