import { useState } from 'react';
import type { AITravelerTone } from '@trailcomand/shared';
import { useAiCapability, useDraftTravelerUpdate } from '@/features/ai/hooks/useAi';
import { AIDraftModal } from '@/features/ai/components/AIDraftModal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

/**
 * "Draft Traveler Update" action on a disruption.
 *
 * The tone is chosen first; opening the modal triggers exactly one request
 * through the shared `AIDraftModal`, which owns loading, error, retry, editing
 * and copy UX. The trip and disruption ids come from the record already on
 * screen — never typed in by the user — so a mismatch is impossible here and is
 * still rejected server-side.
 */
export function DisruptionAiButton({
  tripId,
  disruptionId,
}: {
  tripId: string;
  disruptionId: string;
}) {
  const capability = useAiCapability();
  const draft = useDraftTravelerUpdate();
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<AITravelerTone>('reassuring');

  const enabled = capability.data?.enabled;
  const disabled = enabled === false;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Message tone"
          value={tone}
          onChange={(event) => setTone(event.target.value as AITravelerTone)}
          disabled={disabled}
          className="h-9 w-40"
        >
          <option value="reassuring">Reassuring tone</option>
          <option value="urgent">Urgent tone</option>
        </Select>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled}
          title={disabled ? capability.data?.reason ?? 'AI drafting is unavailable' : 'Draft a traveler update with AI'}
          onClick={() => setOpen(true)}
        >
          Draft Traveler Update
        </Button>
      </div>
      {disabled ? (
        <span role="note" className="mt-1 block w-full text-xs text-fg-subtle">
          AI drafting is not configured
        </span>
      ) : null}
      <AIDraftModal
        open={open}
        onOpenChange={setOpen}
        title="AI traveler update"
        description="A WhatsApp-style draft for this disruption. Edit freely — nothing is sent automatically."
        request={() => draft.mutateAsync({ tripId, disruptionId, tone })}
      />
    </>
  );
}
