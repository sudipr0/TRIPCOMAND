import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SpinnerIcon, WarningIcon } from '@/components/icons';
import { ReportDisruptionDialog } from '@/features/disruptions/components/ReportDisruptionDialog';
import { useDisruptions } from '@/features/disruptions/useDisruptions';
import { formatDateTime } from '@/lib/utils';

const statusVariant: Record<string, BadgeVariant> = { REPORTED: 'danger', ASSESSING: 'warning', PLANNED: 'info', AWAITING_APPROVAL: 'warning', EXECUTING: 'warning', RESOLVED: 'success', CLOSED: 'default' };
const label = (value: string) => value.replaceAll('_', ' ');

export function DisruptionsPage() {
  const disruptions = useDisruptions();
  const [reportOpen, setReportOpen] = useState(false);

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-fg">Disruptions</h1><p className="mt-1 text-sm text-fg-muted">Report, understand, and recover from operational events.</p></div><Button type="button" onClick={() => setReportOpen(true)}>Report disruption</Button></header>
    {disruptions.isPending ? <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-fg-muted"><SpinnerIcon size={22} className="animate-spin" />Loading disruptions...</div> : disruptions.isError ? <Card role="alert" className="p-6 text-sm text-fg-muted">Could not load disruptions. <Button type="button" variant="link" onClick={() => disruptions.refetch()}>Try again</Button></Card> : !disruptions.data.length ? <EmptyState icon={WarningIcon} title="No disruptions reported" description="When a trip changes unexpectedly, report it here to generate a deterministic impact assessment." action={<Button type="button" onClick={() => setReportOpen(true)}>Report disruption</Button>} /> : (
      <Card className="overflow-hidden"><CardHeader><CardTitle>All disruptions <span className="ml-2 text-sm font-normal text-fg-subtle">{disruptions.data.length}</span></CardTitle></CardHeader><CardContent className="p-0"><div className="divide-y divide-border">{disruptions.data.map((disruption) => <Link key={disruption.id} to={`/disruptions/${disruption.id}`} className="block px-5 py-4 transition-colors hover:bg-bg-muted"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs tabular-nums text-fg-subtle">{disruption.disruptionNumber}</span><Badge variant={statusVariant[disruption.status] ?? 'default'}>{label(disruption.status)}</Badge><Badge variant={disruption.severity === 'URGENT' || disruption.severity === 'HIGH' ? 'danger' : 'default'}>{disruption.severity}</Badge></div><h2 className="mt-1 text-sm font-medium text-fg">{disruption.title}</h2><p className="mt-1 text-sm text-fg-muted">{disruption.trip.tripNumber} · {disruption.trip.name}</p></div><span className="whitespace-nowrap text-xs text-fg-subtle">{formatDateTime(disruption.reportedAt)}</span></div></Link>)}</div></CardContent></Card>
    )}
    <ReportDisruptionDialog open={reportOpen} onOpenChange={setReportOpen} />
  </div>;
}
