import { PERMISSION_CODES, type TrekTemplateDetail } from '@tripchange/shared';
import { Link } from 'react-router-dom';

import { CalendarIcon, DestinationIcon, TemplateIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDestination } from '@/features/destinations/hooks/useDestinations';
import { useDeleteTrekTemplate } from '@/features/trek-templates/hooks/useTrekTemplates';
import { useWorkspaceStore } from '@/stores/workspace.store';

export function TemplateStatusBadge({ status }: { status: string }) {
  return <Badge variant={status === 'ACTIVE' ? 'success' : status === 'DRAFT' ? 'warning' : 'default'}>{status.toLowerCase()}</Badge>;
}

export function TemplateDifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === 'EASY' ? 'success' : difficulty === 'MODERATE' ? 'info'
    : difficulty === 'CHALLENGING' ? 'warning' : difficulty === 'STRENUOUS' || difficulty === 'EXTREME' ? 'danger' : 'default';
  return <Badge variant={variant}>{difficulty.toLowerCase()}</Badge>;
}

function LinkedDestinationChip({ destinationId }: { destinationId: string }) {
  const canRead = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.DESTINATION_READ));
  const destination = useDestination(canRead ? destinationId : undefined);
  return <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-subtle px-2.5 py-1 text-xs font-medium text-accent">
    <DestinationIcon size={14} aria-hidden="true" />{destination.data?.name ?? 'Linked destination'}
  </span>;
}

export function TemplateCard({ template }: { template: TrekTemplateDetail }) {
  const canDelete = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TEMPLATE_DELETE));
  const remove = useDeleteTrekTemplate();

  return <Card className="group relative flex h-full flex-col border-border p-5 transition-colors duration-fast hover:border-border-strong hover:shadow-sm focus-within:border-border-strong">
    <Link to={`/trek-templates/${template.id}`} className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" aria-label={`View ${template.name}`} />
    <div className="flex items-start justify-between gap-3">
      <TemplateIcon size={24} className="text-accent" aria-hidden="true" />
      <TemplateDifficultyBadge difficulty={template.difficulty} />
    </div>
    <h2 className="mt-4 text-lg font-semibold text-fg group-hover:text-accent">{template.name}</h2>
    <p className="mt-1 text-sm text-fg-muted">{template.region || 'Region not set'}{template.code ? ` · ${template.code}` : ''}</p>
    {template.description ? <p className="mt-3 line-clamp-2 text-sm text-fg-muted">{template.description}</p> : null}
    <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-fg-muted">
      <span className="inline-flex items-center gap-2"><CalendarIcon size={16} className="text-fg-subtle" aria-hidden="true" />{template.durationDays} {template.durationDays === 1 ? 'day' : 'days'}</span>
      <span>Max altitude: {template.maxAltitude === null ? '—' : `${template.maxAltitude.toLocaleString()} m`}</span>
      <span className="col-span-2 font-medium text-fg">Base price: {template.basePrice === null ? '—' : `${template.basePriceCurrency} ${Number(template.basePrice).toLocaleString()}`}</span>
    </div>
    {template.destinationId ? <div className="mt-4"><LinkedDestinationChip destinationId={template.destinationId} /></div> : null}
    <div className="mt-auto pt-5">
      <div className="flex items-center justify-between gap-2 border-t border-border pt-4 text-sm text-fg-muted">
        <div className="flex flex-wrap items-center gap-3"><span>{template.days?.length ?? 0} itinerary {template.days?.length === 1 ? 'day' : 'days'}</span><TemplateStatusBadge status={template.status} /></div>
        {canDelete ? <ConfirmDialog
          trigger={<Button type="button" size="sm" variant="ghost" className="relative z-10">Delete</Button>}
          title="Delete trek template?" description={`Delete ${template.name}? It will no longer appear in the template list.`}
          confirmLabel="Delete template" variant="danger" onConfirm={async () => { await remove.mutateAsync(template.id); }}
        /> : null}
      </div>
    </div>
  </Card>;
}
