import { PERMISSION_CODES, type StaffDocumentDetail } from '@tripchange/shared';

import { ExternalLinkIcon, FileIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StaffDocumentDialog } from '@/features/staff/components/StaffDocumentDialog';
import { useDeleteStaffDocument, useVerifyStaffDocument } from '@/features/staff/hooks/useStaff';
import { useWorkspaceStore } from '@/stores/workspace.store';

export function StaffDocuments({ staffId, documents }: { staffId: string; documents: StaffDocumentDetail[] }) {
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.STAFF_UPDATE));
  const canVerify = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.STAFF_VERIFY));
  const verify = useVerifyStaffDocument(staffId);
  const remove = useDeleteStaffDocument(staffId);

  return <section id="staff-documents" className="space-y-4 scroll-mt-6">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-fg">Documents</h2>
      {canUpdate ? <StaffDocumentDialog staffId={staffId} /> : null}
    </div>
    {!documents.length ? <EmptyState icon={FileIcon} title="No documents yet" description="Add a document link to keep staff records together." className="rounded-lg border border-border" /> : (
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Type</TableHead><TableHead>Title</TableHead><TableHead>Uploaded</TableHead><TableHead>Expires</TableHead><TableHead>Verified</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {documents.map((document) => <TableRow key={document.id}>
              <TableCell>{document.documentType}</TableCell>
              <TableCell className="min-w-40">
                {/^https?:\/\//i.test(document.fileUrl)
                  ? <a href={document.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                    {document.title}<ExternalLinkIcon size={14} aria-hidden="true" />
                  </a>
                  : <span className="font-medium">{document.title}</span>}
                {document.fileName ? <p className="text-xs text-fg-muted">{document.fileName}</p> : null}
                {document.notes ? <p className="whitespace-pre-wrap text-xs text-fg-muted">{document.notes}</p> : null}
              </TableCell>
              <TableCell className="whitespace-nowrap">{document.createdAt.slice(0, 10)}</TableCell>
              <TableCell className="whitespace-nowrap">{document.expiresAt?.slice(0, 10) ?? '—'}</TableCell>
              <TableCell><Badge variant={document.verified ? 'success' : 'default'}>{document.verified ? 'Verified' : 'Unverified'}</Badge></TableCell>
              <TableCell><div className="flex justify-end gap-1">
                {canVerify ? <ConfirmDialog
                  trigger={<Button type="button" size="sm" variant="ghost">{document.verified ? 'Unverify' : 'Verify'}</Button>}
                  title={document.verified ? 'Remove verification?' : 'Verify document?'}
                  description={document.verified ? `Mark ${document.title} as unverified?` : `Confirm that ${document.title} has been reviewed and verified?`}
                  confirmLabel={document.verified ? 'Unverify' : 'Verify'}
                  onConfirm={async () => { await verify.mutateAsync({ documentId: document.id, input: { verified: !document.verified, ...(document.notes ? { notes: document.notes } : {}) } }); }}
                /> : null}
                {canUpdate ? <ConfirmDialog
                  trigger={<Button type="button" size="sm" variant="ghost">Delete</Button>}
                  title="Delete document?" description={`Delete ${document.title}? This cannot be undone.`}
                  confirmLabel="Delete document" variant="danger" onConfirm={async () => { await remove.mutateAsync(document.id); }}
                /> : null}
                {!canVerify && !canUpdate ? '—' : null}
              </div></TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </Card>
    )}
  </section>;
}
