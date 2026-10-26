import { useState } from 'react';
import type { PortalDocument } from '@trailcomand/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FileIcon, SpinnerIcon, WarningIcon } from '@/components/icons';
import { usePortalUpload } from '@/features/portal/hooks/usePortal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const DOCUMENT_LABELS: Record<string, string> = {
  PASSPORT: 'Passport',
  INSURANCE: 'Insurance',
  VISA: 'Visa',
  VACCINATION: 'Vaccination',
  OTHER: 'Other',
};

const DOCUMENT_SLOTS: Array<'PASSPORT' | 'INSURANCE' | 'VISA' | 'VACCINATION' | 'OTHER'> = [
  'PASSPORT',
  'INSURANCE',
  'VISA',
  'VACCINATION',
  'OTHER',
];

/** What the traveller still needs to provide, derived from the trip's requirements. */
function MissingDocumentNotice({ documents }: { documents: PortalDocument[] }) {
  const have = new Set(documents.filter((doc) => doc.category === 'TRAVELLER_PROVIDED').map((doc) => doc.documentType));
  const missing = (['PASSPORT', 'INSURANCE'] as const).filter((type) => !have.has(type));
  if (!missing.length) return null;
  return (
    <Card className="border-warning/40 bg-[hsl(var(--warning)/0.06)]">
      <CardContent className="flex items-start gap-2 p-4 text-sm">
        <WarningIcon size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
        <p className="text-fg">
          Your organizer has not received your{' '}
          {missing.map((type) => DOCUMENT_LABELS[type].toLowerCase()).join(' or ')} yet. Upload it below so
          they have it on file.
        </p>
      </CardContent>
    </Card>
  );
}

function DocumentRow({ document }: { document: PortalDocument }) {
  const unavailable = Boolean(document.unavailableReason);
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <FileIcon size={18} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{DOCUMENT_LABELS[document.documentType] ?? document.documentType}</Badge>
          <span className="text-xs text-fg-subtle">
            Added {new Date(document.uploadedAt).toLocaleDateString()}
          </span>
        </div>
        {unavailable ? (
          <p className="mt-1 break-words text-sm text-fg-muted">
            {document.fileName}
            <span className="mt-1 block text-xs text-warning">{document.unavailableReason}</span>
          </p>
        ) : (
          <a
            href={document.downloadUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 block truncate text-sm font-medium text-accent hover:underline"
          >
            {document.fileName}
          </a>
        )}
      </div>
    </li>
  );
}

function DocumentGroup({
  title,
  description,
  documents,
  emptyLabel,
}: {
  title: string;
  description: string;
  documents: PortalDocument[];
  emptyLabel: string;
}) {
  return (
    <Card>
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
      </div>
      {documents.length ? (
        <ul className="divide-y divide-border">
          {documents.map((document) => (
            <DocumentRow key={document.id} document={document} />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-fg-subtle">{emptyLabel}</p>
      )}
    </Card>
  );
}

/**
 * Traveller-side upload.
 *
 * This project has no object storage: an upload is a *link* the traveller
 * supplies (the same contract the office and the existing portal already use),
 * so the UI says exactly that rather than pretending a file is being uploaded.
 */
function UploadLinkForm({ token, onDone }: { token: string; onDone: () => void }) {
  const upload = usePortalUpload(token);
  const [documentType, setDocumentType] = useState<(typeof DOCUMENT_SLOTS)[number]>('PASSPORT');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!fileName.trim() || !fileUrl.trim()) {
      setError('Add a file name and a link to the file.');
      return;
    }
    try {
      await upload.mutateAsync({ documentType, fileName: fileName.trim(), fileUrl: fileUrl.trim() });
      onDone();
    } catch {
      // Only a confirmed response may be reported as saved.
      setError('We could not save that link. Check the URL and your connection, then try again.');
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="portal-doc-type">Document type</Label>
            <Select
              id="portal-doc-type"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value as (typeof DOCUMENT_SLOTS)[number])}
            >
              {DOCUMENT_SLOTS.map((value) => (
                <option key={value} value={value}>
                  {DOCUMENT_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="portal-doc-name">What is the file called?</Label>
            <Input
              required
              maxLength={255}
              id="portal-doc-name"
              value={fileName}
              placeholder="passport-sarah.pdf"
              onChange={(event) => setFileName(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="portal-doc-url">Link to the file</Label>
            <Textarea
              required
              id="portal-doc-url"
              value={fileUrl}
              inputMode="url"
              placeholder="https://…"
              onChange={(event) => setFileUrl(event.target.value)}
            />
            <p className="text-xs text-fg-subtle">
              Paste a link your organizer can open (for example a cloud-drive share link). Only the link
              is stored — the file itself stays where it is.
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onDone} disabled={upload.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending ? <SpinnerIcon size={14} className="animate-spin" aria-hidden="true" /> : null}
              {upload.isPending ? 'Saving…' : 'Save link'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function DocumentsTab({ token, documents }: { token: string; documents: PortalDocument[] }) {
  const [adding, setAdding] = useState<(typeof DOCUMENT_SLOTS)[number] | null>(null);
  const mine = documents.filter((document) => document.category === 'TRAVELLER_PROVIDED');
  const fromAgency = documents.filter((document) => document.category === 'AGENCY_PROVIDED');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-fg">Documents</h2>
        <Button type="button" size="sm" variant="secondary" onClick={() => setAdding('PASSPORT')}>
          Add a document
        </Button>
      </div>

      <MissingDocumentNotice documents={documents} />

      {adding ? (
        <UploadLinkForm token={token} onDone={() => setAdding(null)} />
      ) : null}

      {!documents.length ? (
        <EmptyState
          icon={FileIcon}
          title="No documents yet"
          description="Add your passport and insurance so your organizer has them on file. Documents they share with you will appear here too."
        />
      ) : (
        <div className="space-y-4">
          <DocumentGroup
            title="Documents you provided"
            description="Visible to you and your trip organizer."
            documents={mine}
            emptyLabel="You have not added any documents yet."
          />
          <DocumentGroup
            title="From your organizer"
            description="Files your agency shared with you."
            documents={fromAgency}
            emptyLabel="Your organizer has not shared any documents yet."
          />
        </div>
      )}
    </div>
  );
}
