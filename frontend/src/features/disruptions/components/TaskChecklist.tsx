import { useState } from 'react';
import type { RecoveryTaskDetail } from '@trailcomand/shared';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckIcon, ExternalLinkIcon, UncheckedIcon } from '@/components/icons';
import { useCompleteRecoveryTask } from '@/features/disruptions/useDisruptions';
import { formatDate, formatDateTime } from '@/lib/utils';

export function TaskChecklist({ disruptionId, tasks }: { disruptionId: string; tasks: RecoveryTaskDetail[] }) {
  const complete = useCompleteRecoveryTask(disruptionId);
  const [active, setActive] = useState<RecoveryTaskDetail | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState('');

  function close() { if (!complete.isPending) { setActive(null); setEvidenceUrl(''); } }
  function submit(event: React.FormEvent) { event.preventDefault(); if (!active) return; complete.mutate({ taskId: active.id, input: { evidenceUrl: evidenceUrl.trim() || null } }, { onSuccess: close }); }

  return <>
    <Card>
      <CardHeader><CardTitle>Recovery tasks</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => {
          const done = task.status === 'COMPLETED';
          return <div key={task.id} className="flex items-start gap-3 rounded-md border border-border px-4 py-3"><span className="mt-0.5 text-fg-subtle">{done ? <CheckIcon size={18} className="text-success" /> : <UncheckedIcon size={18} />}</span><div className="min-w-0 flex-1"><p className={done ? 'text-sm font-medium text-fg-muted line-through' : 'text-sm font-medium text-fg'}>{task.title}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-subtle">{task.dueAt ? <span>Due {formatDate(task.dueAt)}</span> : null}{task.assignedToId ? <span>Assigned</span> : <span>Unassigned</span>}{done && task.completedAt ? <span>Completed {formatDateTime(task.completedAt)}</span> : null}</div>{task.evidenceUrl ? <a href={task.evidenceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">Evidence <ExternalLinkIcon size={12} /></a> : null}</div>{done ? <Badge variant="success">Completed</Badge> : <Button type="button" size="sm" onClick={() => { setActive(task); setEvidenceUrl(''); }}>Complete</Button>}</div>;
        })}
      </CardContent>
    </Card>
    <Dialog open={Boolean(active)} onOpenChange={(open) => { if (!open) close(); }}><DialogContent><DialogHeader><DialogTitle>Complete task</DialogTitle><DialogDescription>{active?.title}</DialogDescription></DialogHeader><form onSubmit={submit}><label htmlFor="task-evidence" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">Evidence URL <span className="font-normal normal-case">(optional)</span></label><Input id="task-evidence" type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://..." /><DialogFooter><Button type="button" variant="secondary" disabled={complete.isPending} onClick={close}>Cancel</Button><Button type="submit" disabled={complete.isPending}>{complete.isPending ? 'Completing...' : 'Complete task'}</Button></DialogFooter></form></DialogContent></Dialog>
  </>;
}
