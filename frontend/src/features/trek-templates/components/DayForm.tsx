import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTrekTemplateDaySchema, updateTrekTemplateDaySchema,
  type CreateTrekTemplateDayInput, type TrekTemplateDayDetail,
} from '@tripchange/shared';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { TagInput } from '@/features/trek-templates/components/TagInput';
import { useAddTrekTemplateDay, useUpdateTrekTemplateDay } from '@/features/trek-templates/hooks/useTrekTemplates';

const fields = z.object({
  dayNumber: z.string(), title: z.string(), description: z.string(),
  startLocation: z.string(), endLocation: z.string(), altitude: z.string(),
  walkingHours: z.string(), accommodation: z.string(), meals: z.array(z.string()),
  activities: z.array(z.string()),
});
type Values = z.infer<typeof fields>;

function optionalNumber(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function toInput(values: Values): CreateTrekTemplateDayInput {
  return {
    dayNumber: values.dayNumber.trim() ? Number(values.dayNumber) : NaN,
    title: values.title.trim(), description: values.description.trim() || null,
    startLocation: values.startLocation.trim() || null, endLocation: values.endLocation.trim() || null,
    altitude: optionalNumber(values.altitude), walkingHours: optionalNumber(values.walkingHours),
    accommodation: values.accommodation.trim() || null, meals: values.meals, activities: values.activities,
  };
}

function formSchema(dayId: string | undefined, existingDays: TrekTemplateDayDetail[]) {
  return fields.superRefine((values, context) => {
    const input = toInput(values);
    const parsed = dayId ? updateTrekTemplateDaySchema.safeParse(input) : createTrekTemplateDaySchema.safeParse(input);
    if (!parsed.success) parsed.error.issues.forEach((issue) => context.addIssue({
      code: z.ZodIssueCode.custom, path: issue.path, message: issue.message,
    }));
    if (parsed.success && existingDays.some((existing) => existing.dayNumber === input.dayNumber && existing.id !== dayId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['dayNumber'], message: 'This day number is already in use' });
    }
  });
}

function defaults(day?: TrekTemplateDayDetail, nextDayNumber = 1): Values {
  return {
    dayNumber: String(day?.dayNumber ?? nextDayNumber), title: day?.title ?? '',
    description: day?.description ?? '', startLocation: day?.startLocation ?? '',
    endLocation: day?.endLocation ?? '', altitude: day?.altitude?.toString() ?? '',
    walkingHours: day?.walkingHours ?? '', accommodation: day?.accommodation ?? '',
    meals: day?.meals ?? [], activities: day?.activities ?? [],
  };
}

export function DayForm({ templateId, trigger, day, existingDays, nextDayNumber = 1 }: {
  templateId: string; trigger: ReactNode; day?: TrekTemplateDayDetail; existingDays: TrekTemplateDayDetail[]; nextDayNumber?: number;
}) {
  const [open, setOpen] = useState(false);
  const add = useAddTrekTemplateDay(templateId);
  const update = useUpdateTrekTemplateDay(templateId, day?.id ?? '');
  const pending = add.isPending || update.isPending;
  const form = useForm<Values>({ resolver: zodResolver(formSchema(day?.id, existingDays)), defaultValues: defaults(day, nextDayNumber) });
  const { errors } = form.formState;

  function changeOpen(next: boolean) {
    if (pending) return;
    form.reset(defaults(day, nextDayNumber));
    setOpen(next);
  }

  function submit(values: Values) {
    const onSuccess = () => setOpen(false);
    if (day) update.mutate(toInput(values), { onSuccess });
    else add.mutate(toInput(values), { onSuccess });
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{day ? `Edit day ${day.dayNumber}` : 'Add itinerary day'}</DialogTitle>
          <DialogDescription>Each day number must be unique within this template.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="day-number" label="Day number" required error={errors.dayNumber?.message}>
              <Input id="day-number" type="number" min={1} step={1} aria-invalid={Boolean(errors.dayNumber)} {...form.register('dayNumber')} />
            </FormField>
            <FormField htmlFor="day-title" label="Title" required error={errors.title?.message}>
              <Input id="day-title" maxLength={200} aria-invalid={Boolean(errors.title)} {...form.register('title')} />
            </FormField>
            <FormField htmlFor="day-start" label="Start location" error={errors.startLocation?.message}>
              <Input id="day-start" {...form.register('startLocation')} />
            </FormField>
            <FormField htmlFor="day-end" label="End location" error={errors.endLocation?.message}>
              <Input id="day-end" {...form.register('endLocation')} />
            </FormField>
            <FormField htmlFor="day-altitude" label="Altitude (m)" error={errors.altitude?.message}>
              <Input id="day-altitude" type="number" min={-500} max={9000} step={1} aria-invalid={Boolean(errors.altitude)} {...form.register('altitude')} />
            </FormField>
            <FormField htmlFor="day-walking" label="Walking hours" error={errors.walkingHours?.message}>
              <Input id="day-walking" type="number" min={0} max={24} step={0.5} aria-invalid={Boolean(errors.walkingHours)} {...form.register('walkingHours')} />
            </FormField>
          </div>
          <FormField htmlFor="day-accommodation" label="Accommodation" error={errors.accommodation?.message}>
            <Input id="day-accommodation" {...form.register('accommodation')} />
          </FormField>
          <FormField htmlFor="day-description" label="Description" error={errors.description?.message}>
            <Textarea id="day-description" aria-invalid={Boolean(errors.description)} {...form.register('description')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ['meals', 'Meals', 'e.g. Breakfast'],
              ['activities', 'Activities', 'e.g. Trek to base camp'],
            ] as const).map(([name, label, placeholder]) => <Controller key={name} name={name} control={form.control} render={({ field }) =>
              <FormField htmlFor={`day-${name}`} label={label} error={errors[name]?.message}>
                <TagInput id={`day-${name}`} value={field.value} onChange={field.onChange} placeholder={placeholder} />
              </FormField>
            } />)}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => changeOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : day ? 'Save day' : 'Add day'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
