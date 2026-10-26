import type { DisruptionImpactDetail } from '@trailcomand/shared';

import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChecklistIcon, ErrorIcon, SupplierIcon, TravelerIcon, UsersThreeIcon } from '@/components/icons';

const typeMeta: Record<string, { label: string; variant: BadgeVariant; icon: React.ElementType }> = {
  SERVICE: { label: 'Booking', variant: 'danger', icon: SupplierIcon },
  STAFF: { label: 'Staff', variant: 'warning', icon: UsersThreeIcon },
  TRAVELER: { label: 'Traveler', variant: 'info', icon: TravelerIcon },
  ITINERARY: { label: 'Itinerary', variant: 'default', icon: ChecklistIcon },
};

export function ImpactGraphCard({ impacts }: { impacts: DisruptionImpactDetail[] }) {
  const direct = impacts.filter((impact) => impact.impactType === 'DIRECT').length;
  const dependent = impacts.filter((impact) => impact.impactType === 'DEPENDENT').length;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Impact graph</CardTitle><p className="mt-1 text-sm text-fg-muted">Deterministic graph traversal from the reported disruption.</p></div><div className="flex gap-2"><Badge variant="danger">{direct} direct</Badge><Badge variant="warning">{dependent} dependent</Badge></div></CardHeader>
      <CardContent>
        {!impacts.length ? <div className="flex items-center gap-2 rounded-md border border-border bg-bg-subtle px-3 py-3 text-sm text-fg-muted"><ErrorIcon size={16} />No dependent entities were found in the trip graph.</div> : (
          <div className="space-y-3">
            {impacts.map((impact) => {
              const meta = typeMeta[impact.entityType] ?? { label: impact.entityType, variant: 'default' as BadgeVariant, icon: ChecklistIcon };
              const Icon = meta.icon;
              return <div key={impact.id} className="rounded-md border border-border px-4 py-3"><div className="flex items-start gap-3"><Icon size={18} className="mt-0.5 shrink-0 text-fg-subtle" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-fg">{impact.entityName}</p><Badge variant={meta.variant}>{meta.label}</Badge><Badge variant={impact.impactType === 'DIRECT' ? 'danger' : 'warning'}>{impact.impactType}</Badge></div><p className="mt-1 text-sm text-fg-muted">{impact.reasoning}</p><p className="mt-2 text-xs tabular-nums text-fg-subtle">Confidence {impact.confidence}%</p></div></div></div>;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
