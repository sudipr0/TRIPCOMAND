import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTrekTemplateSchema, updateTrekTemplateSchema, TEMPLATE_STATUSES, TREK_DIFFICULTIES,
  type CreateTrekTemplateInput, type TrekTemplateDetail,
} from '@trailcomand/shared';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useDestination, useDestinationList } from '@/features/destinations/hooks/useDestinations';
import { TagInput } from '@/features/trek-templates/components/TagInput';
import { useCreateTrekTemplate, useUpdateTrekTemplate } from '@/features/trek-templates/hooks/useTrekTemplates';

const fields = z.object({
  name: z.string(), code: z.string(), description: z.string(), region: z.string(),
  difficulty: z.enum(TREK_DIFFICULTIES), durationDays: z.string(), maxAltitude: z.string(),
  bestSeasons: z.array(z.string()), basePrice: z.string(), basePriceCurrency: z.string(),
  requiredDocuments: z.array(z.string()), packingList: z.string(), preparationNotes: z.string(),
  inclusions: z.array(z.string()), exclusions: z.array(z.string()), terms: z.string(),
  destinationId: z.string(), status: z.enum(TEMPLATE_STATUSES),
});
type Values = z.infer<typeof fields>;

function optionalNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function toInput(values: Values): CreateTrekTemplateInput {
  return {
    name: values.name.trim(), code: values.code.trim() || null,
    description: values.description.trim() || null, region: values.region.trim() || null,
    difficulty: values.difficulty, durationDays: values.durationDays.trim() ? Number(values.durationDays) : NaN,
    maxAltitude: optionalNumber(values.maxAltitude), bestSeasons: values.bestSeasons,
    basePrice: optionalNumber(values.basePrice), basePriceCurrency: values.basePriceCurrency.trim(),
    requiredDocuments: values.requiredDocuments,
    ...(values.packingList.trim() ? { packingList: JSON.parse(values.packingList) as unknown } : {}),
    preparationNotes: values.preparationNotes.trim() || null,
    inclusions: values.inclusions, exclusions: values.exclusions, terms: values.terms.trim() || null,
    destinationId: values.destinationId || null,
  };
}

function formSchema(editing: boolean) {
  return fields.superRefine((values, context) => {
    if (values.packingList.trim()) {
      try {
        if (JSON.parse(values.packingList) === null) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: ['packingList'], message: 'Use [] to empty the packing list instead of null' });
          return;
        }
      } catch {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['packingList'], message: 'Enter valid JSON for the packing list' });
        return;
      }
    }
    const input = toInput(values);
    const parsed = editing
      ? updateTrekTemplateSchema.safeParse({ ...input, status: values.status })
      : createTrekTemplateSchema.safeParse(input);
    if (!parsed.success) parsed.error.issues.forEach((issue) => context.addIssue({
      code: z.ZodIssueCode.custom, path: issue.path, message: issue.message,
    }));
  });
}

function defaults(template?: TrekTemplateDetail): Values {
  return {
    name: template?.name ?? '', code: template?.code ?? '',
    description: template?.description ?? '', region: template?.region ?? '',
    difficulty: TREK_DIFFICULTIES.find((item) => item === template?.difficulty) ?? 'MODERATE',
    durationDays: template?.durationDays.toString() ?? '',
    maxAltitude: template?.maxAltitude?.toString() ?? '',
    bestSeasons: template?.bestSeasons ?? [], basePrice: template?.basePrice ?? '',
    basePriceCurrency: template?.basePriceCurrency ?? 'NPR',
    requiredDocuments: template?.requiredDocuments ?? [],
    packingList: template?.packingList == null ? '' : JSON.stringify(template.packingList, null, 2),
    preparationNotes: template?.preparationNotes ?? '',
    inclusions: template?.inclusions ?? [], exclusions: template?.exclusions ?? [],
    terms: template?.terms ?? '', destinationId: template?.destinationId ?? '',
    status: TEMPLATE_STATUSES.find((item) => item === template?.status) ?? 'DRAFT',
  };
}

export function TemplateForm({ trigger, template }: { trigger: ReactNode; template?: TrekTemplateDetail }) {
  const [open, setOpen] = useState(false);
  const [destinationSearch, setDestinationSearch] = useState('');
  const destinations = useDestinationList({ limit: 50, offset: 0, ...(destinationSearch.trim() ? { search: destinationSearch.trim() } : {}) });
  const create = useCreateTrekTemplate();
  const update = useUpdateTrekTemplate(template?.id ?? '');
  const pending = create.isPending || update.isPending;
  const form = useForm<Values>({ resolver: zodResolver(formSchema(Boolean(template))), defaultValues: defaults(template) });
  const { errors } = form.formState;

  function changeOpen(next: boolean) {
    if (pending) return;
    form.reset(defaults(template));
    setDestinationSearch('');
    setOpen(next);
  }

  function submit(values: Values) {
    const input = toInput(values);
    const onSuccess = () => { setOpen(false); setDestinationSearch(''); };
    if (template) update.mutate({ ...input, status: values.status }, { onSuccess });
    else create.mutate(input, { onSuccess });
  }

  const selectedId = form.watch('destinationId');
  const selectedDestination = useDestination(selectedId || undefined);
  const selectedInResults = destinations.data?.items.some((destination) => destination.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit trek template' : 'Add trek template'}</DialogTitle>
          <DialogDescription>Set the route, pricing and what is included. Add itinerary days from the template detail page.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="template-name" label="Name" required error={errors.name?.message}>
              <Input id="template-name" maxLength={200} aria-invalid={Boolean(errors.name)} {...form.register('name')} />
            </FormField>
            <FormField htmlFor="template-code" label="Code" error={errors.code?.message}>
              <Input id="template-code" maxLength={60} aria-invalid={Boolean(errors.code)} {...form.register('code')} />
            </FormField>
            <FormField htmlFor="template-region" label="Region" error={errors.region?.message}>
              <Input id="template-region" maxLength={120} aria-invalid={Boolean(errors.region)} {...form.register('region')} />
            </FormField>
            <FormField htmlFor="template-difficulty" label="Difficulty" required error={errors.difficulty?.message}>
              <Select id="template-difficulty" {...form.register('difficulty')}>
                {TREK_DIFFICULTIES.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty.toLowerCase()}</option>)}
              </Select>
            </FormField>
            <FormField htmlFor="template-duration" label="Duration (days)" required error={errors.durationDays?.message}>
              <Input id="template-duration" type="number" min={1} max={365} step={1} aria-invalid={Boolean(errors.durationDays)} {...form.register('durationDays')} />
            </FormField>
            <FormField htmlFor="template-altitude" label="Max altitude (m)" error={errors.maxAltitude?.message}>
              <Input id="template-altitude" type="number" min={-500} max={9000} step={1} aria-invalid={Boolean(errors.maxAltitude)} {...form.register('maxAltitude')} />
            </FormField>
            <FormField htmlFor="template-price" label="Base price" error={errors.basePrice?.message}>
              <Input id="template-price" type="number" min={0} step="any" aria-invalid={Boolean(errors.basePrice)} {...form.register('basePrice')} />
            </FormField>
            <FormField htmlFor="template-currency" label="Currency" error={errors.basePriceCurrency?.message}>
              <Input id="template-currency" maxLength={10} aria-invalid={Boolean(errors.basePriceCurrency)} {...form.register('basePriceCurrency')} />
            </FormField>
            {template ? <FormField htmlFor="template-status" label="Status" error={errors.status?.message}>
              <Select id="template-status" {...form.register('status')}>
                {TEMPLATE_STATUSES.map((status) => <option key={status} value={status}>{status.toLowerCase()}</option>)}
              </Select>
            </FormField> : null}
          </div>
          <FormField htmlFor="template-destination-search" label="Find destination">
            <Input id="template-destination-search" maxLength={120} placeholder="Search destinations by name" value={destinationSearch} onChange={(event) => setDestinationSearch(event.target.value)} />
          </FormField>
          <FormField htmlFor="template-destination" label="Destination" error={errors.destinationId?.message}>
            <Select id="template-destination" {...form.register('destinationId')}>
              <option value="">No destination</option>
              {selectedId && !selectedInResults ? <option value={selectedId}>{selectedDestination.data?.name ?? template?.destination?.name ?? 'Selected destination'}</option> : null}
              {destinations.data?.items.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
            </Select>
          </FormField>
          {destinations.isError ? <p role="alert" className="text-sm text-danger">Could not load destinations. <Button type="button" variant="link" onClick={() => destinations.refetch()}>Try again</Button></p> : null}
          {destinations.data && destinations.data.total > destinations.data.items.length ? <p className="text-xs text-fg-subtle">Showing the first 50 results. Search by name to find more destinations.</p> : null}
          <FormField htmlFor="template-description" label="Description" error={errors.description?.message}>
            <Textarea id="template-description" aria-invalid={Boolean(errors.description)} {...form.register('description')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ['bestSeasons', 'Best seasons', 'e.g. Spring'],
              ['requiredDocuments', 'Required documents', 'e.g. Passport'],
              ['inclusions', 'Inclusions', 'e.g. Accommodation'],
              ['exclusions', 'Exclusions', 'e.g. Flights'],
            ] as const).map(([name, label, placeholder]) => <Controller key={name} name={name} control={form.control} render={({ field }) =>
              <FormField htmlFor={`template-${name}`} label={label} error={errors[name]?.message}>
                <TagInput id={`template-${name}`} value={field.value} onChange={field.onChange} placeholder={placeholder} />
              </FormField>
            } />)}
          </div>
          <FormField htmlFor="template-packing" label="Packing list (JSON)" error={errors.packingList?.message} hint="Optional JSON list or object. Use [] to empty an existing packing list.">
            <Textarea id="template-packing" aria-invalid={Boolean(errors.packingList)} placeholder='["Warm layers", "Water bottle"]' {...form.register('packingList')} />
          </FormField>
          <FormField htmlFor="template-preparation" label="Preparation notes" error={errors.preparationNotes?.message}>
            <Textarea id="template-preparation" aria-invalid={Boolean(errors.preparationNotes)} {...form.register('preparationNotes')} />
          </FormField>
          <FormField htmlFor="template-terms" label="Terms" error={errors.terms?.message}>
            <Textarea id="template-terms" aria-invalid={Boolean(errors.terms)} {...form.register('terms')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => changeOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : template ? 'Save changes' : 'Add template'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
