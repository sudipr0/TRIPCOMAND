import type { PortalCommandCenter } from '@trailcomand/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckIcon,
  ClockIcon,
  ErrorIcon,
  InfoIcon,
  MedicalIcon,
  SpinnerIcon,
  WarningIcon,
} from '@/components/icons';
import { CallLink } from '@/features/portal/components/PortalPrimitives';
import { useHelpRequest } from '@/features/portal/hooks/usePortal';

/** Contact block. Each row renders only when the agency published that detail. */
function ContactsCard({ emergency }: { emergency: PortalCommandCenter['emergency'] }) {
  const hasAgencyPhone = Boolean(emergency.contactPhone);
  const hasGuidePhone = Boolean(emergency.guide?.phone);
  const hasEmergencyLine = Boolean(emergency.emergencyPhone);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Who to call</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <CallLink
          phone={emergency.guide?.phone}
          label={emergency.guide ? `Call ${emergency.guide.fullName}` : 'Call your guide'}
          description={emergency.guide?.role ?? 'With you on the trip'}
        />
        <CallLink
          phone={emergency.contactPhone}
          label={`Call ${emergency.agencyName}`}
          description="Trip organizer"
          variant={hasGuidePhone ? 'secondary' : 'primary'}
        />
        {hasEmergencyLine ? (
          <CallLink
            phone={emergency.emergencyPhone}
            label="Agency emergency line"
            description="24-hour line"
            variant="secondary"
          />
        ) : null}

        {!hasAgencyPhone && !hasGuidePhone ? (
          <p className="flex items-start gap-2 rounded-md border-border bg-bg-subtle px-3 py-2 text-sm text-fg-muted">
            <InfoIcon size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
            Your organizer has not published a phone number here. Send them a message with the form below.
          </p>
        ) : null}

        {emergency.emergencyContactName || emergency.emergencyContactPhone ? (
          <div className="rounded-md border-border px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-fg-subtle">Your emergency contact</p>
            <p className="mt-0.5 text-sm font-medium text-fg">{emergency.emergencyContactName}</p>
            {emergency.emergencyContactPhone ? (
              <a
                href={`tel:${emergency.emergencyContactPhone.replace(/[^\d+]/g, '')}`}
                className="text-sm text-accent hover:underline"
              >
                {emergency.emergencyContactPhone}
              </a>
            ) : null}
          </div>
        ) : null}

        {emergency.contactEmail ? (
          <p className="text-sm">
            <a className="text-accent hover:underline" href={`mailto:${emergency.contactEmail}`}>
              {emergency.contactEmail}
            </a>
          </p>
        ) : null}
        {emergency.address ? <p className="text-sm text-fg-muted">{emergency.address}</p> : null}
      </CardContent>
    </Card>
  );
}

function InstructionsCard({ instructions }: { instructions: string | null }) {
  if (!instructions) return null;
  return (
    <Card className="border-info/40 bg-[hsl(var(--info)/0.05)]">
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <MedicalIcon size={18} className="text-info" aria-hidden="true" />
        <CardTitle className="text-base">In an emergency</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="whitespace-pre-wrap text-sm text-fg-muted">{instructions}</p>
      </CardContent>
    </Card>
  );
}

export function HelpTab({ token, emergency }: { token: string; emergency: PortalCommandCenter['emergency'] }) {
  const help = useHelpRequest(token);

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold tracking-tight text-fg">Help &amp; emergency</h2>
        <p className="mt-0.5 text-sm text-fg-muted">
          Contact your guide first if you are on the trail. For anything else, message your organizer below.
        </p>
      </header>

      <ContactsCard emergency={emergency} />
      <InstructionsCard instructions={emergency.instructions} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Report a problem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {help.confirmation ? (
            <div role="status" className="space-y-2 rounded-md border-success/40 bg-[hsl(var(--success)/0.08)] p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckIcon size={16} weight="bold" aria-hidden="true" />
                Sent to your organizer
              </p>
              <p className="text-xs text-fg-muted">
                Received {new Date(help.confirmation.createdAt).toLocaleString()}. Reference{' '}
                <span className="tabular-nums">{help.confirmation.reportId.slice(0, 8)}</span>.
              </p>
              <Button type="button" size="sm" variant="secondary" onClick={help.reset}>
                Send another message
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="portal-help-message">What is the problem?</Label>
                <Textarea
                  id="portal-help-message"
                  value={help.draft}
                  maxLength={1500}
                  onChange={(event) => help.setDraft(event.target.value)}
                  placeholder="For example: our transfer from Lukla has not arrived and we are waiting at the lodge."
                  aria-describedby="portal-help"
                  aria-invalid={Boolean(help.error)}
                />
                <p id="portal-help" className="text-xs text-fg-subtle">
                  Your name, trip and this message are sent to your organizer. {help.draft.trim().length}/1500
                  characters. This form does not contact emergency services.
                </p>
              </div>

              {help.queuedOffline ? (
                <div role="alert" className="space-y-2 rounded-md border-warning/50 bg-[hsl(var(--warning)/0.08)] p-3">
                  <p className="flex items-start gap-2 text-sm font-medium text-fg">
                    <WarningIcon size={15} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                    Not sent — you are offline
                  </p>
                  <p className="text-xs text-fg-muted">
                    Your message is still in this box. It has <strong>not</strong> reached your organizer.
                    Connect to the internet and press Send again. If this is urgent, call instead.
                  </p>
                </div>
              ) : null}

              {help.error ? (
                <p role="alert" className="flex items-start gap-1.5 text-sm text-danger">
                  <ErrorIcon size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {help.error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void help.submit()}
                  disabled={!help.canSubmit || help.isSubmitting}
                  aria-busy={help.isSubmitting}
                >
                  {help.isSubmitting ? (
                    <SpinnerIcon size={14} className="animate-spin" aria-hidden="true" />
                  ) : null}
                  {help.isSubmitting ? 'Sending…' : 'Send to my organizer'}
                </Button>
                {!help.online ? (
                  <Badge variant="warning">
                    <ClockIcon size={12} className="mr-1" aria-hidden="true" />
                    Offline
                  </Badge>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-fg-subtle">
        Submitting this form sends a message to your trip organizer. It does not alert emergency services,
        the embassy or your insurance provider.
      </p>
    </div>
  );
}
