import { PERMISSION_CODES } from '@trailcomand/shared';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { SpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateDifficultyBadge, TemplateStatusBadge } from '@/features/trek-templates/components/TemplateCard';
import { TemplateForm } from '@/features/trek-templates/components/TemplateForm';
import { TemplateItinerary } from '@/features/trek-templates/components/TemplateItinerary';
import { TemplateLinkedDestination } from '@/features/trek-templates/components/TemplateLinkedDestination';
import { TemplateOverview } from '@/features/trek-templates/components/TemplateOverview';
import { useDeleteTrekTemplate, useTrekTemplate } from '@/features/trek-templates/hooks/useTrekTemplates';
import { useWorkspaceStore } from '@/stores/workspace.store';

function DetailContent({ templateId }: { templateId: string }) {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TEMPLATE_UPDATE));
  const canDelete = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TEMPLATE_DELETE));
  const template = useTrekTemplate(templateId);
  const remove = useDeleteTrekTemplate();

  if (!workspaceId) return <p className="text-sm text-fg-muted">Select a workspace to view this template.</p>;
  if (template.isPending) return <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-fg-muted"><SpinnerIcon size={22} className="animate-spin" />Loading trek template...</div>;
  if (template.isError) return <Card className="p-6 text-sm text-fg-muted" role="alert">Could not load this trek template. <Button type="button" variant="link" onClick={() => template.refetch()}>Try again</Button></Card>;

  return <>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold tracking-tight text-fg">{template.data.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
          <TemplateDifficultyBadge difficulty={template.data.difficulty} />
          <TemplateStatusBadge status={template.data.status} />
          {template.data.region ? <span>· {template.data.region}</span> : null}
          {template.data.maxAltitude !== null ? <span>· Max {template.data.maxAltitude.toLocaleString()} m</span> : null}
        </div>
      </div>
      <div className="flex gap-2">
        {canUpdate ? <TemplateForm template={template.data} trigger={<Button type="button" variant="secondary">Edit template</Button>} /> : null}
        {canDelete ? <ConfirmDialog trigger={<Button type="button" variant="ghost" className="text-danger hover:text-danger">Delete</Button>}
          title="Delete trek template?" description={`Delete ${template.data.name}? It will no longer appear in the template list.`}
          confirmLabel="Delete template" variant="danger"
          onConfirm={async () => { await remove.mutateAsync(templateId); navigate('/trek-templates'); }} /> : null}
      </div>
    </header>
    <Tabs defaultValue="overview">
      <TabsList aria-label="Trek template sections"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="itinerary">Itinerary</TabsTrigger>
        {template.data.destinationId ? <TabsTrigger value="destination">Linked Destination</TabsTrigger> : null}
      </TabsList>
      <TabsContent value="overview"><TemplateOverview template={template.data} /></TabsContent>
      <TabsContent value="itinerary"><TemplateItinerary templateId={templateId} /></TabsContent>
      {template.data.destinationId ? <TabsContent value="destination"><TemplateLinkedDestination destinationId={template.data.destinationId} destination={template.data.destination} /></TabsContent> : null}
    </Tabs>
  </>;
}

export function TrekTemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  return <div className="mx-auto max-w-5xl space-y-6">
    <Button type="button" variant="link" asChild><Link to="/trek-templates">Back to templates</Link></Button>
    {templateId ? <DetailContent templateId={templateId} /> : <p role="alert">Trek template not found.</p>}
  </div>;
}
