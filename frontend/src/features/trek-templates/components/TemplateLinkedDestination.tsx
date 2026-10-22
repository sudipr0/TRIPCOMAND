import type { DestinationDetail } from '@tripchange/shared';

import { DestinationIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDestination } from '@/features/destinations/hooks/useDestinations';

export function TemplateLinkedDestination({ destinationId, destination }: { destinationId: string; destination?: DestinationDetail | null }) {
  const lookup = useDestination(destination ? undefined : destinationId);
  const linked = destination ?? lookup.data;

  if (!linked && lookup.isPending) return <Skeleton className="h-48 w-full" />;
  if (!linked) return <Card role="alert" className="p-6 text-sm text-fg-muted">Could not load the linked destination. <Button type="button" variant="link" onClick={() => lookup.refetch()}>Try again</Button></Card>;

  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><DestinationIcon size={20} className="text-accent" aria-hidden="true" />{linked.name}</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      {linked.imageUrl ? <img src={linked.imageUrl} alt={linked.name} className="max-h-64 w-full rounded-md object-cover" /> : null}
      <dl className="grid gap-4 text-sm sm:grid-cols-3">
        <div><dt className="text-fg-muted">Region</dt><dd className="mt-1 font-medium text-fg">{linked.region || '—'}</dd></div>
        <div><dt className="text-fg-muted">Country</dt><dd className="mt-1 font-medium text-fg">{linked.country}</dd></div>
        <div><dt className="text-fg-muted">Altitude</dt><dd className="mt-1 font-medium text-fg">{linked.altitude === null ? '—' : `${linked.altitude.toLocaleString()} m`}</dd></div>
      </dl>
      {linked.description ? <p className="whitespace-pre-wrap text-sm text-fg-muted">{linked.description}</p> : null}
    </CardContent>
  </Card>;
}
