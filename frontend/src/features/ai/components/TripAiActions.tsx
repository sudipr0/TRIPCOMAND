import { useState } from 'react';
import { useAiCapability, useSummarizeTrip } from '@/features/ai/hooks/useAi';
import { Button } from '@/components/ui/button';
import { SpinnerIcon } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CopyIcon, WarningIcon } from '@/components/icons';
import { toast } from 'sonner';

/**
 * "Summarize trip" action for the Trip Overview.
 *
 * Capability is probed once, so a deployment without AI configured shows a
 * disabled button with an explanation rather than firing requests that are
 * guaranteed to fail. The dialog shows exactly what the server produced and
 * prompts the user to review it before copying anything onward.
 */

export function TripAiButton({ tripId }: { tripId: string }) {
  const capability = useAiCapability();
  const summarize = useSummarizeTrip();
  const [open, setOpen] = useState(false);
  const [bullets, setBullets] = useState<string[] | null>(null);

  // Undefined while probing: keep the button interactive but a no-op.
  const enabled = capability.data?.enabled;
  const disabled = enabled === false;

  function generate() {
    setOpen(true);
    setBullets(null);
    summarize.mutate(tripId, {
      onSuccess: (draft) => {
        if (draft.operation === 'trip_summary') setBullets(draft.bullets);
      },
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        title={disabled ? capability.data?.reason ?? 'AI drafting is unavailable' : 'Summarize this trip with AI'}
        onClick={generate}
      >
        {summarize.isPending && open ? <SpinnerIcon size={16} className="animate-spin" /> : null}
        Ask AI
      </Button>
      {disabled ? (
        <span role="note" className="hidden text-xs text-fg-subtle lg:inline">
          AI drafting is not configured
        </span>
      ) : null}
      <AISummaryDialog
        open={open}
        onOpenChange={setOpen}
        loading={summarize.isPending}
        error={summarize.isError ? summarize.error : null}
        bullets={bullets}
        onRetry={generate}
      />
    </>
  );
}

interface AISummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error: unknown;
  bullets: string[] | null;
  onRetry: () => void;
}

/** Renders the three-bullet summary with review disclaimers and copy support. */
export function AISummaryDialog({ open, onOpenChange, loading, error, bullets, onRetry }: AISummaryDialogProps) {
  const editable = bullets ? bullets.join('\n') : '';
  const [text, setText] = useState('');

  // Keep the textarea in sync when a new summary arrives, but let the user edit
  // freely afterwards (the value is only re-set when `editable` changes).
  const [syncedEditable, setSyncedEditable] = useState('');
  if (editable !== syncedEditable) {
    setSyncedEditable(editable);
    setText(editable);
  }

  function extractMessage(caught: unknown): string {
    if (caught && typeof caught === 'object' && 'message' in caught) {
      return String((caught as { message: unknown }).message);
    }
    return 'Could not generate a summary. Please try again.';
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!loading) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>AI trip summary</DialogTitle>
          <DialogDescription>Three points from the recorded operational state of this trip.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
            <SpinnerIcon size={20} className="animate-spin" />
            Generating summary...
          </div>
        ) : error ? (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-danger bg-[hsl(var(--danger)/0.06)] px-3 py-2 text-sm text-danger">
            <WarningIcon size={16} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p>{extractMessage(error)}</p>
              <Button type="button" variant="link" size="sm" className="mt-1 px-0" onClick={onRetry}>
                Try again
              </Button>
            </div>
          </div>
        ) : bullets ? (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="ai-summary-text" className="block text-xs font-medium uppercase tracking-wide text-fg-subtle">Summary</label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(text);
                      toast.success('Summary copied to clipboard');
                    } catch {
                      toast.error('Could not copy the summary. Please select and copy manually.');
                    }
                  }}
                >
                  <CopyIcon size={14} /> Copy
                </Button>
              </div>
              <Textarea
                id="ai-summary-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={4}
                aria-describedby="ai-summary-disclaimer"
              />
            </div>
            <p id="ai-summary-disclaimer" className="flex items-start gap-2 rounded-md bg-bg-muted px-3 py-2 text-xs font-medium text-fg-muted">
              <WarningIcon size={14} className="mt-0.5 shrink-0" />
              AI-generated. Please review before sending.
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Badge variant="default" className="mr-auto hidden sm:inline-flex">Draft only — nothing is sent</Badge>
          <Button type="button" variant="secondary" disabled={loading} onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
