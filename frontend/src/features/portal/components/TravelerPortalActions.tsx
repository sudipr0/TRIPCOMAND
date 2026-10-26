import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import type { PortalTravelerDocuments } from '@trailcomand/shared';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { extractError } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatDateTime } from '@/lib/utils';
import { SpinnerIcon, WarningIcon } from '@/components/icons';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { useTripDocuments } from '@/features/portal/hooks/usePortal';
import { useIssuePortalLink } from '@/features/portal/hooks/usePortal';
import { useOfficeUploadDocument } from '@/features/portal/hooks/usePortal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const DOCUMENT_LABELS: Record<string, string> = {
  PASSPORT: 'Passport',
  INSURANCE: 'Insurance',
  VISA: 'Visa',
  VACCINATION: 'Vaccination',
  OTHER: 'Other',
};

const ACCESS_VARIANTS: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  EXPIRED: 'warning',
  REVOKED: 'danger',
};

function documentSummary(entry: PortalTravelerDocuments) {
  if (!entry.documents.length) return 'No documents';
  const counts = new Map<string, number>();
  for (const document of entry.documents) {
    counts.set(document.documentType, (counts.get(document.documentType) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => `${DOCUMENT_LABELS[type] ?? type} (${count})`)
    .join(', ');
}

function absolutePortalUrl(path: string) {
  return `${window.location.origin}${path}`;
}

/** Copies the link, then falls back to a prompt-free toast if the clipboard is blocked. */
async function copyPortalLink(path: string) {
  const absolute = absolutePortalUrl(path);
  try {
    await navigator.clipboard.writeText(absolute);
    return true;
  } catch {
    return false;
  }
}

/**
 * Row action for one traveler: issues (or rotates) their magic link and copies
 * it. Rotation means an old link stops working — worth stating in the toast.
 */
export function PortalLinkButton({
  tripId,
  travelerId,
  travelerName,
}: {
  tripId: string;
  travelerId: string;
  travelerName: string;
}) {
  const issue = useIssuePortalLink(tripId);

  async function handleClick() {
    try {
      const link = await issue.mutateAsync(travelerId);
      const copied = await copyPortalLink(link.url);
      toast.success(copied ? `Portal link for ${travelerName} copied` : `Portal link for ${travelerName} created`, {
        description: copied
          ? `Valid until ${formatDate(link.expiresAt)}. Any previous link no longer works.`
          : absolutePortalUrl(link.url),
      });
    } catch (error) {
      toast.error(extractError(error)?.message ?? 'Could not create the portal link.');
    }
  }

  return (
    <Button
      size="sm"
      type="button"
      variant="secondary"
      onClick={handleClick}
      disabled={issue.isPending}
      aria-label={`Get portal link for ${travelerName}`}
    >
      {issue.isPending ? <SpinnerIcon size={14} className="animate-spin" /> : null}
      Get Portal Link
    </Button>
  );
}

/** Office management view: every traveler's documents plus their portal-link state. */
export function TripDocumentsDialog({
  tripId,
  open,
  onOpenChange,
}: {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const documents = useTripDocuments(open ? tripId : undefined);
  const upload = useOfficeUploadDocument(tripId);
  const [travelerId, setTravelerId] = useState('');
  const [documentType, setDocumentType] = useState('PASSPORT');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  useEffect(() => {
    if (!travelerId && documents.data?.length) setTravelerId(documents.data[0].travelerId);
  }, [documents.data, travelerId]);

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    try {
      await upload.mutateAsync({ travelerId, documentType: documentType as never, fileName, fileUrl });
      toast.success('Document added');
      setFileName('');
      setFileUrl('');
    } catch (error) {
      toast.error(extractError(error)?.message ?? 'Could not add the document.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Traveler documents</DialogTitle>
          <DialogDescription>
            What each traveler has on file. Documents uploaded through the portal appear here automatically.
          </DialogDescription>
        </DialogHeader>

        {documents.isPending ? (
          <div className="space-y-2" role="status" aria-label="Loading documents">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : documents.isError ? (
          <p role="alert" className="text-sm text-fg-muted">
            Could not load documents.{' '}
            <Button type="button" variant="link" className="h-auto px-0" onClick={() => documents.refetch()}>
              Try again
            </Button>
          </p>
        ) : !documents.data.length ? (
          <p className="text-sm text-fg-muted">This trip has no travelers yet.</p>
        ) : (
          <div className="max-h-[45vh] space-y-4 overflow-y-auto pr-1">
            {documents.data.map((entry) => (
              <section key={entry.travelerId} className="rounded-lg border-border px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">{entry.travelerName}</p>
                    <p className="mt-0.5 text-xs text-fg-subtle">{documentSummary(entry)}</p>
                  </div>
                  {entry.portalAccess ? (
                    <Badge variant={ACCESS_VARIANTS[entry.portalAccess.status] ?? 'default'}>
                      Portal {entry.portalAccess.status.toLowerCase()}
                    </Badge>
                  ) : (
                    <Badge variant="default">No portal link</Badge>
                  )}
                </div>

                {entry.documents.length ? (
                  <ul className="mt-3 space-y-2">
                    {entry.documents.map((document) => (
                      <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <Badge variant="info">{DOCUMENT_LABELS[document.documentType] ?? document.documentType}</Badge>
                          <a
                            target="_blank"
                            href={document.fileUrl}
                            rel="noreferrer noopener"
                            className="ml-2 break-all text-accent hover:underline"
                          >
                            {document.fileName}
                          </a>
                        </div>
                        <span className="shrink-0 text-xs text-fg-subtle">
                          {document.uploadedByTraveler ? 'Traveler' : 'Office'} · {formatDateTime(document.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-subtle">
                    <WarningIcon size={12} /> Nothing uploaded yet
                  </p>
                )}
              </section>
            ))}
          </div>
        )}

        <Separator />

        <form onSubmit={handleUpload} className="space-y-3">
          <p className="text-sm font-medium text-fg">Add a document on a traveler's behalf</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="office-doc-traveler">Traveler</Label>
              <Select
                required
                value={travelerId}
                id="office-doc-traveler"
                onChange={(event) => setTravelerId(event.target.value)}
              >
                {(documents.data ?? []).map((entry) => (
                  <option key={entry.travelerId} value={entry.travelerId}>{entry.travelerName}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="office-doc-type">Type</Label>
              <Select
                id="office-doc-type"
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
              >
                {Object.entries(DOCUMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="office-doc-name">File name</Label>
              <Input
                required
                maxLength={255}
                value={fileName}
                id="office-doc-name"
                placeholder="sarah-passport.pdf"
                onChange={(event) => setFileName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="office-doc-url">File link</Label>
              <Input
                required
                value={fileUrl}
                id="office-doc-url"
                placeholder="https://files.example.com/..."
                onChange={(event) => setFileUrl(event.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
            <Button type="submit" disabled={upload.isPending || !travelerId}>
              {upload.isPending ? <SpinnerIcon size={16} className="animate-spin" /> : null}
              Add document
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
