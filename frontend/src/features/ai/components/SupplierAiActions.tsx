import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AIDraftModal } from '@/features/ai/components/AIDraftModal';
import { DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAiCapability, useDraftSupplierEmail } from '@/features/ai/hooks/useAi';
import { useSupplierBookingsList } from '@/features/suppliers/hooks/useSupplierBookings';

/**
 * "Draft Email" action on the supplier detail page.
 *
 * Two steps: a small dialog collects an optional note about what to ask (bounded
 * server-side to 1000 characters), then the shared `AIDraftModal` shows the
 * draft with an editable subject and body. The recipient shown in the modal is
 * whatever the supplier record holds — or an explicit "not on record" notice.
 */
export function SupplierDraftEmailButton({
  supplierId,
}: {
  supplierId: string;
}) {
  const capability = useAiCapability();
  const draft = useDraftSupplierEmail();
  const bookings = useSupplierBookingsList(supplierId);
  const [contextOpen, setContextOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [messageContext, setMessageContext] = useState('');

  const enabled = capability.data?.enabled;
  // The inquiry must be about a trip this supplier is actually booked on; the
  // server rejects anything else, so the action is hidden without one.
  const tripId = bookings.data?.[0]?.tripId;
  const disabled = enabled === false || !tripId;

  return (
    <>
      <Button
        size="sm"
        type="button"
        variant="secondary"
        disabled={disabled}
        onClick={() => setContextOpen(true)}
        title={
          !tripId
            ? 'No trip books this supplier yet — add a supplier booking first'
            : disabled
              ? capability.data?.reason ?? 'AI drafting is unavailable'
              : 'Draft an availability inquiry email'
        }
      >
        Draft Email
      </Button>

      {contextOpen ? (
        <Dialog open={contextOpen} onOpenChange={setContextOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>What should the email ask?</DialogTitle>
              <DialogDescription>
                Optional: describe what you need from this supplier. Their recorded services on the trip are included automatically.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              rows={4}
              maxLength={1000}
              value={messageContext}
              aria-label="Message context for the AI draft"
              onChange={(event) => setMessageContext(event.target.value)}
              placeholder="e.g. Ask whether they can run the airport transfer on 3 April for 8 people"
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setContextOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setContextOpen(false);
                  setDraftOpen(true);
                }}
              >
                Draft email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <AIDraftModal
        open={draftOpen}
        title="AI supplier email"
        onOpenChange={setDraftOpen}
        description="An availability inquiry for this supplier. Review and copy — nothing is sent automatically."
        request={() =>
          draft.mutateAsync({
            supplierId,
            tripId: tripId!,
            messageContext: messageContext.trim(),
          })
        }
      />
    </>
  );
}
