import { SpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useItineraryVersions } from '@/features/trips/hooks/useTrips';
import { formatDateTime } from '@/lib/utils';

export function ItineraryVersionsDialog({ tripId, open, onOpenChange }: {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const versions = useItineraryVersions(tripId, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Itinerary versions</DialogTitle>
          <DialogDescription>Each publish creates an immutable snapshot of the itinerary.</DialogDescription>
        </DialogHeader>
        {versions.isPending ? (
          <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-fg-muted">
            <SpinnerIcon size={18} className="animate-spin" />Loading versions...
          </div>
        ) : versions.isError ? (
          <p role="alert" className="text-sm text-fg-muted">
            Could not load versions. <Button type="button" variant="link" onClick={() => versions.refetch()}>Try again</Button>
          </p>
        ) : !versions.data?.length ? (
          <p className="py-6 text-center text-sm text-fg-muted">No versions published yet.</p>
        ) : (
          <ol className="space-y-3">
            {versions.data.map((version) => (
              <li key={version.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">v{version.version}</p>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {version.publishedAt ? formatDateTime(version.publishedAt) : formatDateTime(version.createdAt)}
                  </p>
                  {version.changeNotes ? <p className="mt-1 text-xs text-fg-subtle">{version.changeNotes}</p> : null}
                </div>
                <Badge variant={version.status === 'PUBLISHED' ? 'success' : version.status === 'ARCHIVED' ? 'default' : 'info'}>
                  {version.status.charAt(0) + version.status.slice(1).toLowerCase()}
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
