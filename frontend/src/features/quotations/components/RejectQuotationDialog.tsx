import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useRejectQuotation } from '@/features/quotations/hooks/useQuotations';

export interface RejectQuotationDialogProps {
  quotationId: string;
  quotationNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RejectQuotationDialog({ quotationId, quotationNumber, open, onOpenChange }: RejectQuotationDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const reject = useRejectQuotation(quotationId);

  function close() {
    if (reject.isPending) return;
    setReason('');
    setError('');
    onOpenChange(false);
  }

  function submit() {
    const trimmed = reason.trim();
    if (trimmed.length < 3) { setError('Enter at least 3 characters'); return; }
    if (trimmed.length > 500) { setError('Use 500 characters or fewer'); return; }
    reject.mutate(trimmed, { onSuccess: () => { setReason(''); setError(''); onOpenChange(false); } });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject quotation?</DialogTitle>
          <DialogDescription>Please provide a reason. It will be recorded on {quotationNumber}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <FormField htmlFor="quotation-rejection-reason" label="Rejection reason" required error={error}>
            <Textarea id="quotation-rejection-reason" rows={3} maxLength={500} value={reason} aria-invalid={Boolean(error)}
              placeholder="Price too high, dates changed..."
              onChange={(event) => { setReason(event.target.value); setError(''); }} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={reject.isPending} onClick={close}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={reject.isPending}>
              {reject.isPending ? 'Rejecting...' : 'Reject quotation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
