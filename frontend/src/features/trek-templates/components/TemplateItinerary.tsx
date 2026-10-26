import { PERMISSION_CODES } from '@trailcomand/shared';

import { AddIcon, BuildingsIcon, DeleteIcon, DestinationIcon, EditIcon, FileIcon, TemplateIcon, TripIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { DayForm } from '@/features/trek-templates/components/DayForm';
import { useDeleteTrekTemplateDay, useTrekTemplateDays } from '@/features/trek-templates/hooks/useTrekTemplates';
import { useWorkspaceStore } from '@/stores/workspace.store';

export function TemplateItinerary({ templateId }: { templateId: string }) {
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TEMPLATE_UPDATE));
  const days = useTrekTemplateDays(templateId);
  const remove = useDeleteTrekTemplateDay(templateId);
  const ordered = [...(days.data ?? [])].sort((a, b) => a.dayNumber - b.dayNumber);
  const nextDayNumber = ordered.length ? ordered[ordered.length - 1].dayNumber + 1 : 1;
  const countLabel = days.isSuccess ? `${ordered.length} ${ordered.length === 1 ? 'day' : 'days'}` : null;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-fg">Itinerary</h2>{countLabel ? <p className="mt-1 text-sm text-fg-muted">{countLabel}</p> : null}</div>
      {canUpdate && days.isSuccess ? <DayForm templateId={templateId} existingDays={ordered} nextDayNumber={nextDayNumber} trigger={<Button type="button" size="sm"><AddIcon size={16} />Add day</Button>} /> : null}
    </div>
    {days.isPending ? <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" /></div>
      : days.isError ? <Card role="alert" className="p-6 text-sm text-fg-muted">Could not load itinerary days. <Button type="button" variant="link" onClick={() => days.refetch()}>Try again</Button></Card>
        : ordered.length === 0 ? <Card><EmptyState icon={TemplateIcon} title="No itinerary days yet" description="Add the first day to build this trek's itinerary." /></Card>
          : <ol className="space-y-3">{ordered.map((day) => <li key={day.id}>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-accent">Day {day.dayNumber}</p><h3 className="mt-1 text-lg font-semibold text-fg">{day.title}</h3></div>
                {canUpdate ? <div className="flex gap-1">
                  <DayForm templateId={templateId} day={day} existingDays={ordered} trigger={<Button type="button" size="sm" variant="ghost"><EditIcon size={14} aria-hidden="true" />Edit</Button>} />
                  <ConfirmDialog trigger={<Button type="button" size="sm" variant="ghost"><DeleteIcon size={14} aria-hidden="true" />Delete</Button>}
                    title="Delete itinerary day?" description={`Delete day ${day.dayNumber}: ${day.title}? This cannot be undone.`}
                    confirmLabel="Delete day" variant="danger" onConfirm={async () => { await remove.mutateAsync(day.id); }} />
                </div> : null}
              </div>
              {day.description ? <p className="mt-3 whitespace-pre-wrap text-sm text-fg-muted">{day.description}</p> : null}
              <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {([
                  ['From', day.startLocation, DestinationIcon], ['To', day.endLocation, DestinationIcon],
                  ['Altitude', day.altitude === null ? null : `${day.altitude.toLocaleString()} m`, DestinationIcon],
                  ['Walking', day.walkingHours === null ? null : `${day.walkingHours} hours`, TemplateIcon],
                  ['Accommodation', day.accommodation, BuildingsIcon], ['Meals', day.meals.join(', '), FileIcon],
                  ['Activities', day.activities.join(', '), TripIcon],
                ] as const).filter(([, value]) => value).map(([label, value, Icon]) => <div key={label} className="flex items-start gap-2">
                  <Icon size={16} className="mt-0.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                  <div><dt className="text-fg-subtle">{label}</dt><dd className="text-fg">{value}</dd></div>
                </div>)}
              </dl>
            </Card>
          </li>)}</ol>}
  </div>;
}
