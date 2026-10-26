import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ImpactGraphCard } from '@/features/disruptions/components/ImpactGraphCard';
import { CreateRecoveryPlanDialog } from '@/features/disruptions/components/CreateRecoveryPlanDialog';
import { TaskChecklist } from '@/features/disruptions/components/TaskChecklist';
import { useApproveRecoveryPlan, useDisruption } from '@/features/disruptions/useDisruptions';
import { formatDateTime } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const statusVariant: Record<string, BadgeVariant> = { REPORTED: 'danger', ASSESSING: 'warning', PLANNED: 'info', AWAITING_APPROVAL: 'warning', EXECUTING: 'warning', RESOLVED: 'success', CLOSED: 'default' };
const label = (value: string) => value.replaceAll('_', ' ');

export function DisruptionDetailPage() {
  const { disruptionId } = useParams<{ disruptionId: string }>();
  const navigate = useNavigate();
  const disruption = useDisruption(disruptionId);
  const [tab, setTab] = useState('impact');
  const [planOpen, setPlanOpen] = useState(false);
  const approve = useApproveRecoveryPlan(disruptionId ?? '');

  if (disruption.isPending) return <div className="mx-auto max-w-6xl space-y-6"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (disruption.isError || !disruption.data) return <div className="mx-auto max-w-6xl"><Card className="p-6 text-sm text-fg-muted">Could not load this disruption. <Button type="button" variant="link" onClick={() => disruption.refetch()}>Try again</Button></Card></div>;

  const item = disruption.data;
  const plan = item.recoveryPlan;
  return <div className="mx-auto max-w-6xl space-y-6">
    <Button type="button" variant="link" onClick={() => navigate('/disruptions')}>Back to disruptions</Button>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs tabular-nums text-fg-subtle">{item.disruptionNumber}</span><Badge variant={statusVariant[item.status] ?? 'default'}>{label(item.status)}</Badge><Badge variant={item.severity === 'URGENT' || item.severity === 'HIGH' ? 'danger' : 'default'}>{item.severity}</Badge></div><h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">{item.title}</h1><p className="mt-1 text-sm text-fg-muted"><Link to={`/trips/${item.tripId}`} className="text-accent hover:underline">{item.trip.tripNumber} · {item.trip.name}</Link></p></div></header>
    <Tabs value={tab} onValueChange={setTab}><TabsList><TabsTrigger value="impact">Impact analysis</TabsTrigger><TabsTrigger value="plan">Recovery plan</TabsTrigger><TabsTrigger value="overview">Overview</TabsTrigger></TabsList><TabsContent value="impact"><ImpactGraphCard impacts={item.impacts} /></TabsContent><TabsContent value="plan"><div className="space-y-4">{!plan ? <Card><CardContent className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-base font-semibold text-fg">No recovery plan yet</h2><p className="mt-1 text-sm text-fg-muted">Turn the impact assessment into an approval-ready checklist.</p></div><Button type="button" onClick={() => setPlanOpen(true)}>Create recovery plan</Button></CardContent></Card> : <><Card><CardContent className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-fg-subtle">Plan status</p><p className="mt-1 text-base font-semibold text-fg">{label(plan.status)}</p>{plan.estimatedCost ? <p className="mt-1 text-sm text-fg-muted">Estimated cost: {plan.estimatedCost}</p> : null}</div>{plan.status === 'DRAFT' ? <Button type="button" disabled={approve.isPending} onClick={() => approve.mutate()}>{approve.isPending ? 'Approving...' : 'Approve plan'}</Button> : null}</CardContent></Card><TaskChecklist disruptionId={item.id} tasks={plan.tasks} /></>}</div></TabsContent><TabsContent value="overview"><Card><CardContent><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="text-xs uppercase tracking-wide text-fg-subtle">Category</dt><dd className="mt-1 text-sm text-fg">{label(item.category)}</dd></div><div><dt className="text-xs uppercase tracking-wide text-fg-subtle">Reported</dt><dd className="mt-1 text-sm text-fg">{formatDateTime(item.reportedAt)}</dd></div><div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-fg-subtle">Description</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-fg">{item.description}</dd></div><div><dt className="text-xs uppercase tracking-wide text-fg-subtle">Impacts</dt><dd className="mt-1 text-sm text-fg">{item.impacts.length} entities</dd></div><div><dt className="text-xs uppercase tracking-wide text-fg-subtle">Resolved</dt><dd className="mt-1 text-sm text-fg">{item.resolvedAt ? formatDateTime(item.resolvedAt) : 'Not resolved'}</dd></div></dl></CardContent></Card></TabsContent></Tabs>
    {planOpen ? <CreateRecoveryPlanDialog disruptionId={item.id} open onOpenChange={setPlanOpen} /> : null}
  </div>;
}
