import { useEffect, useRef, useState } from 'react';
import type { AIDraft } from '@trailcomand/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CopyIcon, SpinnerIcon, WarningIcon } from '@/components/icons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Reusable AI draft modal.
 *
 * The component is intentionally dumb about *how* the draft was produced: the
 * caller supplies the request as an async function, and this component owns the
 * loading / error / result / copy UX. That keeps the three integration points
 * (trip, disruption, supplier) small and identical in behaviour.
 *
 * Every state shown here reinforces the same message: this is a draft for a
 * human to review. Nothing in this component sends, posts, books or confirms.
 */

export interface AIDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title shown in the dialog header. */
  title: string;
  /** One-line description of what the draft is for. */
  description: string;
  /**
   * Produces the draft. Called on mount of an open modal (and on Retry).
   * Receives an AbortSignal so a closed modal can cancel an in-flight request.
   */
  request: (signal: AbortSignal) => Promise<AIDraft>;
  /** Extra hint shown when the draft is missing facts the model could not verify. */
  missingFactHints?: Record<string, string>;
}

const DEFAULT_MISSING_HINTS: Record<string, string> = {
  SUPPLIER_EMAIL: 'No email address is recorded for this supplier — add one manually before sending.',
  RECOVERY_NEXT_STEPS: 'No approved recovery steps are recorded yet, so the draft does not promise one.',
  TRIP_NOTES: 'No itinerary days are recorded for this trip yet.',
};

/** Text a given draft is edited in. */
function draftText(draft: AIDraft): { subject?: string; body: string; bullets?: string[] } {
  if (draft.operation === 'supplier_email') {
    return { subject: draft.subject, body: draft.body };
  }
  if (draft.operation === 'trip_summary') {
    return { body: draft.bullets.map((bullet) => `- ${bullet}`).join('\n') };
  }
  return { body: draft.body };
}

export function AIDraftModal({
  open,
  onOpenChange,
  title,
  description,
  request,
  missingFactHints = DEFAULT_MISSING_HINTS,
}: AIDraftModalProps) {
  // Local editable copy of the draft. Reset every time a new draft arrives.
  const [draft, setDraft] = useState<AIDraft | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  // Fire the request when the modal opens (or Retry is pressed).
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setDraft(null);

    request(controller.signal)
      .then((result) => {
        if (cancelled) return;
        setDraft(result);
        const text = draftText(result);
        setEditedSubject(text.subject ?? '');
        setEditedBody(text.body);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        // A closed modal aborts its own request; that is not an error to show.
        const aborted = caught instanceof DOMException && caught.name === 'AbortError';
        if (aborted) return;
        const message =
          typeof caught === 'object' && caught && 'message' in caught
            ? String((caught as { message: unknown }).message)
            : 'Could not generate a draft. Please try again.';
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      abortRef.current = null;
    };
    // `request` is intentionally excluded: it is usually an inline arrow that
    // would otherwise retrigger the request on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requestKey]);

  function close(next: boolean) {
    if (loading && next) return; // no dismiss while in flight
    abortRef.current?.abort();
    onOpenChange(next);
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      // Never pretend the copy worked when it did not.
      toast.error(`Could not copy the ${label.toLowerCase()}. Please select and copy manually.`);
    }
  }

  const fullText = editedSubject ? `Subject: ${editedSubject}\n\n${editedBody}` : editedBody;
  const missing = draft?.metadata.missingFacts ?? [];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted">
            <SpinnerIcon size={20} className="animate-spin" />
            Generating draft...
          </div>
        ) : error ? (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-danger bg-[hsl(var(--danger)/0.06)] px-3 py-2 text-sm text-danger">
            <WarningIcon size={16} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p>{error}</p>
              <Button type="button" variant="link" size="sm" className="mt-1 px-0" onClick={() => setRequestKey((k) => k + 1)}>
                Try again
              </Button>
            </div>
          </div>
        ) : draft ? (
          <div className="space-y-4">
            {missing.length > 0 ? (
              <ul className="space-y-1 rounded-md border border-warning bg-[hsl(var(--warning)/0.06)] px-3 py-2 text-xs text-fg" role="note">
                {missing.map((fact) => (
                  <li key={fact} className="flex items-start gap-2">
                    <WarningIcon size={14} className="mt-0.5 shrink-0 text-warning" />
                    <span>{missingFactHints[fact] ?? 'Some details in this draft could not be verified — review before sending.'}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {draft.operation === 'supplier_email' ? (
              <div>
                <label htmlFor="ai-draft-subject" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  Subject
                </label>
                <Input
                  id="ai-draft-subject"
                  value={editedSubject}
                  onChange={(event) => setEditedSubject(event.target.value)}
                  maxLength={200}
                />
              </div>
            ) : null}

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="ai-draft-body" className="block text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  {draft.operation === 'trip_summary' ? 'Summary' : draft.operation === 'supplier_email' ? 'Email body' : 'Message'}
                </label>
                <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => copy(fullText, 'Draft')}>
                  <CopyIcon size={14} /> Copy
                </Button>
              </div>
              <Textarea
                id="ai-draft-body"
                value={editedBody}
                onChange={(event) => setEditedBody(event.target.value)}
                rows={draft.operation === 'trip_summary' ? 4 : 8}
                aria-describedby="ai-draft-disclaimer"
              />
            </div>

            {draft.operation === 'supplier_email' ? (
              <p className="text-xs text-fg-muted">
                Recipient: {draft.recipient ?? <span className="text-warning">not on record — enter it manually before sending</span>}
              </p>
            ) : null}

            <p id="ai-draft-disclaimer" className={cn('flex items-start gap-2 rounded-md bg-bg-muted px-3 py-2 text-xs font-medium text-fg-muted')}>
              <WarningIcon size={14} className="mt-0.5 shrink-0" />
              AI-generated. Please review before sending.
            </p>
          </div>
        ) : null}

        <DialogFooter>
          <Badge variant="default" className="mr-auto hidden sm:inline-flex">Draft only — nothing is sent</Badge>
          <Button type="button" variant="secondary" disabled={loading} onClick={() => close(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
