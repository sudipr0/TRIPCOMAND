import type { TrekTemplateDetail } from '@tripchange/shared';
import { useState } from 'react';

import { SpinnerIcon, WarningIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTrekTemplateList } from '@/features/trek-templates/hooks/useTrekTemplates';
import { usePopulateFromTemplate } from '@/features/trips/hooks/useTrips';
import { cn } from '@/lib/utils';

export function TemplatePickerDialog({ tripId, existingDays, open, onOpenChange }: {
  tripId: string;
  existingDays: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const templates = useTrekTemplateList({ limit: 100, offset: 0 });
  const populate = usePopulateFromTemplate(tripId);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const items: TrekTemplateDetail[] = templates.data?.items ?? [];
  const filtered = items.filter((template) => template.name.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = items.find((template) => template.id === selectedId);

  function submit() {
    if (!selectedId) return;
    if (existingDays > 0 && !confirmReplace) { setConfirmReplace(true); return; }
    populate.mutate({ templateId: selectedId }, { onSuccess: () => { setConfirmReplace(false); onOpenChange(false); } });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!populate.isPending) { setConfirmReplace(false); onOpenChange(next); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Populate from template</DialogTitle>
          <DialogDescription>Copy a trek template&rsquo;s days into this trip&rsquo;s itinerary.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input aria-label="Search templates" placeholder="Search templates" value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="max-h-72 overflow-y-auto rounded-md border border-border">
            {templates.isPending ? (
              <div role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-fg-muted">
                <SpinnerIcon size={18} className="animate-spin" />Loading templates...
              </div>
            ) : !filtered.length ? (
              <p className="px-4 py-8 text-center text-sm text-fg-muted">
                {items.length ? 'No templates match this search.' : 'No trek templates yet. Create one under Trek templates first.'}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((template) => (
                  <li key={template.id}>
                    <button type="button" onClick={() => { setSelectedId(template.id); setConfirmReplace(false); }}
                      aria-pressed={selectedId === template.id}
                      className={cn('flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-fast',
                        selectedId === template.id ? 'bg-accent-subtle' : 'hover:bg-bg-muted')}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">{template.name}</p>
                        <p className="mt-0.5 truncate text-xs text-fg-muted">
                          {template.durationDays ?? '—'} days · {template.region ?? 'No region'}
                        </p>
                      </div>
                      {template.difficulty ? <Badge>{template.difficulty}</Badge> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selected && existingDays > 0 ? (
            <p className="flex items-start gap-2 rounded-md bg-bg-subtle px-3 py-2 text-xs text-fg-muted">
              <WarningIcon size={14} className="mt-0.5 shrink-0 text-warning" />
              This will replace {existingDays} existing {existingDays === 1 ? 'day' : 'days'}.
            </p>
          ) : null}
          {confirmReplace ? (
            <p role="alert" className="rounded-md border border-danger px-3 py-2 text-xs text-danger">
              Replacing {existingDays} existing days cannot be undone. Press the button again to confirm.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={populate.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={!selectedId || populate.isPending} onClick={submit}>
            {populate.isPending ? 'Populating...' : confirmReplace ? 'Replace itinerary' : 'Use template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
