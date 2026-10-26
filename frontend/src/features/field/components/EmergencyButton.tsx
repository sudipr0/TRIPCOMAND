import { useRef, useState } from 'react';
import type { CreateFieldReportInput } from '@trailcomand/shared';

import { ErrorIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface EmergencyButtonProps {
  onSend: (input: CreateFieldReportInput) => Promise<'sent' | 'queued'>;
  onResult: (outcome: 'sent' | 'queued') => void;
}

/**
 * Deliberately loud: one confirmation, then a single un-queued POST that falls back
 * to the offline queue only if the network actually fails.
 */
export function EmergencyButton({ onSend, onResult }: EmergencyButtonProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  // Generated when the confirmation opens so a retried fallback keeps the same clientId.
  const clientId = useRef(crypto.randomUUID());

  async function confirm() {
    setSending(true);
    const payload: CreateFieldReportInput = {
      reportType: 'EMERGENCY',
      severity: 'URGENT',
      description: description.trim() || 'Emergency raised from the trail',
      location: null,
      photoUrls: [],
      recordedAt: new Date().toISOString(),
      clientId: clientId.current,
    };
    try {
      const outcome = await onSend(payload);
      setDescription('');
      // A new alert is a new record; rotate the id for the next emergency.
      clientId.current = crypto.randomUUID();
      onResult(outcome);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        size="lg"
        type="button"
        variant="danger"
        onClick={() => setOpen(true)}
        aria-describedby="emergency-hint"
        className="h-20 w-full flex-col gap-1 rounded-lg text-md font-semibold"
      >
        <span className="flex items-center gap-2">
          <ErrorIcon size={22} weight="fill" />
          EMERGENCY
        </span>
        <span id="emergency-hint" className="text-xs font-normal opacity-90">
          Sends to the office immediately
        </span>
      </Button>

      <ConfirmDialog
        open={open}
        variant="danger"
        onConfirm={confirm}
        onOpenChange={setOpen}
        title="Send an emergency alert?"
        confirmLabel={sending ? 'Sending...' : 'Send emergency'}
        description={`This notifies the office now and bypasses the normal queue. Use it for injuries, missing travelers, or unsafe conditions.`}
      >
        <Textarea
          rows={3}
          autoFocus
          value={description}
          aria-label="Emergency description"
          placeholder="Briefly describe the situation"
          onChange={(event) => setDescription(event.target.value)}
        />
      </ConfirmDialog>
    </>
  );
}
