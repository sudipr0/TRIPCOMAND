import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMembers } from '@/features/workspace/hooks/useMembers';
import { useCreateRecoveryPlan } from '@/features/disruptions/useDisruptions';

interface TaskDraft { title: string; assignedToId: string; dueAt: string; }

export function CreateRecoveryPlanDialog({ disruptionId, open, onOpenChange }: { disruptionId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const members = useMembers();
  const create = useCreateRecoveryPlan(disruptionId);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');
  const [tasks, setTasks] = useState<TaskDraft[]>([{ title: '', assignedToId: '', dueAt: '' }]);
  const [error, setError] = useState('');

  function updateTask(index: number, key: keyof TaskDraft, value: string) {
    setTasks((current) => current.map((task, taskIndex) => taskIndex === index ? { ...task, [key]: value } : task));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const valid = tasks.filter((task) => task.title.trim());
    if (!valid.length) { setError('Add at least one task'); return; }
    if (valid.length > 5) { setError('Recovery plans can contain up to 5 tasks'); return; }
    setError('');
    create.mutate({
      estimatedCost: estimatedCost ? Number(estimatedCost) : null,
      notes: notes.trim() || null,
      tasks: valid.map((task) => ({
        title: task.title.trim(),
        assignedToId: task.assignedToId || null,
        dueAt: task.dueAt ? new Date(`${task.dueAt}T00:00:00`) : null,
      })),
    }, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!create.isPending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create recovery plan</DialogTitle>
          <DialogDescription>Define the bounded work needed to restore the trip. Add up to five tasks.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="recovery-cost" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">Estimated cost</label>
              <Input id="recovery-cost" type="number" min="0" step="0.01" value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label htmlFor="recovery-notes" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">Notes</label>
              <Input id="recovery-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Approval context" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-fg">Tasks</h3><span className="text-xs text-fg-subtle">{tasks.length}/5</span></div>
            {tasks.map((task, index) => (
              <div key={`task-${index}`} className="rounded-md border border-border p-3">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)]">
                  <Input aria-label={`Task ${index + 1} title`} value={task.title} onChange={(event) => updateTask(index, 'title', event.target.value)} placeholder={`Task ${index + 1}`} maxLength={200} />
                  <Input aria-label={`Task ${index + 1} due date`} type="date" value={task.dueAt} onChange={(event) => updateTask(index, 'dueAt', event.target.value)} />
                </div>
                <select aria-label={`Task ${index + 1} assignee`} value={task.assignedToId} onChange={(event) => updateTask(index, 'assignedToId', event.target.value)} className="mt-3 flex h-9 w-full rounded-md border border-border bg-bg px-3 text-sm text-fg">
                  <option value="">Unassigned</option>
                  {(members.data ?? []).map((member) => <option key={member.userId} value={member.userId}>{member.user.firstName} {member.user.lastName}</option>)}
                </select>
                {tasks.length > 1 ? <Button type="button" variant="link" size="sm" className="mt-2" onClick={() => setTasks((current) => current.filter((_, taskIndex) => taskIndex !== index))}>Remove task</Button> : null}
              </div>
            ))}
            {tasks.length < 5 ? <Button type="button" variant="secondary" size="sm" onClick={() => setTasks((current) => [...current, { title: '', assignedToId: '', dueAt: '' }])}>Add task</Button> : null}
          </div>
          <div><label htmlFor="recovery-plan-notes" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-fg-subtle">Plan notes</label><Textarea id="recovery-plan-notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional notes for the approver" /></div>
          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={create.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Create plan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
