import { zodResolver } from '@hookform/resolvers/zod';
import {
  createDestinationSchema, updateDestinationSchema,
  type CreateDestinationInput, type DestinationDetail,
} from '@trailcomand/shared';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useCreateDestination, useUpdateDestination } from '@/features/destinations/hooks/useDestinations';

const fields = z.object({
  name: z.string(),
  region: z.string(),
  country: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  altitude: z.string(),
  description: z.string(),
  imageUrl: z.string(),
});
type Values = z.infer<typeof fields>;

function toInput(values: Values): CreateDestinationInput {
  return {
    name: values.name.trim(),
    region: values.region.trim() || null,
    country: values.country.trim(),
    latitude: values.latitude.trim() ? Number(values.latitude) : null,
    longitude: values.longitude.trim() ? Number(values.longitude) : null,
    altitude: values.altitude.trim() ? Number(values.altitude) : null,
    description: values.description.trim() || null,
    imageUrl: values.imageUrl.trim() || null,
  };
}

function formSchema(editing: boolean) {
  return fields.superRefine((values, context) => {
    const parsed = editing
      ? updateDestinationSchema.safeParse(toInput(values))
      : createDestinationSchema.safeParse(toInput(values));
    if (!parsed.success) parsed.error.issues.forEach((issue) => context.addIssue({
      code: z.ZodIssueCode.custom, path: issue.path, message: issue.message,
    }));
  });
}

function defaults(destination?: DestinationDetail): Values {
  return {
    name: destination?.name ?? '',
    region: destination?.region ?? '',
    country: destination?.country ?? 'Nepal',
    latitude: destination?.latitude ?? '',
    longitude: destination?.longitude ?? '',
    altitude: destination?.altitude?.toString() ?? '',
    description: destination?.description ?? '',
    imageUrl: destination?.imageUrl ?? '',
  };
}

interface DestinationDialogProps {
  trigger?: ReactNode;
  destination?: DestinationDetail;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DestinationDialog({ trigger, destination, open: controlledOpen, onOpenChange }: DestinationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const create = useCreateDestination();
  const update = useUpdateDestination(destination?.id ?? '');
  const pending = create.isPending || update.isPending;
  const form = useForm<Values>({
    resolver: zodResolver(formSchema(Boolean(destination))),
    defaultValues: defaults(destination),
  });
  const { errors } = form.formState;

  function setOpen(next: boolean) {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  }

  function changeOpen(next: boolean) {
    if (pending) return;
    form.reset(defaults(destination));
    setOpen(next);
  }

  function submit(values: Values) {
    const input = toInput(values);
    const onSuccess = () => {
      form.reset(defaults(destination));
      setOpen(false);
    };
    if (destination) {
      update.mutate(input, { onSuccess });
    } else {
      create.mutate(input, { onSuccess });
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{destination ? 'Edit destination' : 'Add destination'}</DialogTitle>
          <DialogDescription>{destination ? 'Update destination details.' : 'Add a destination to this workspace.'}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField htmlFor="destination-name" label="Name" required error={errors.name?.message}>
            <Input id="destination-name" maxLength={120} aria-invalid={Boolean(errors.name)} {...form.register('name')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="destination-region" label="Region" error={errors.region?.message}>
              <Input id="destination-region" maxLength={120} aria-invalid={Boolean(errors.region)} {...form.register('region')} />
            </FormField>
            <FormField htmlFor="destination-country" label="Country" required error={errors.country?.message}>
              <Input id="destination-country" maxLength={120} aria-invalid={Boolean(errors.country)} {...form.register('country')} />
            </FormField>
            <FormField htmlFor="destination-latitude" label="Latitude" error={errors.latitude?.message}>
              <Input id="destination-latitude" type="number" step="any" min={-90} max={90} aria-invalid={Boolean(errors.latitude)} {...form.register('latitude')} />
            </FormField>
            <FormField htmlFor="destination-longitude" label="Longitude" error={errors.longitude?.message}>
              <Input id="destination-longitude" type="number" step="any" min={-180} max={180} aria-invalid={Boolean(errors.longitude)} {...form.register('longitude')} />
            </FormField>
            <FormField htmlFor="destination-altitude" label="Altitude (m)" error={errors.altitude?.message}>
              <Input id="destination-altitude" type="number" step={1} min={-500} max={9000} aria-invalid={Boolean(errors.altitude)} {...form.register('altitude')} />
            </FormField>
            <FormField htmlFor="destination-image-url" label="Image URL" error={errors.imageUrl?.message}>
              <Input id="destination-image-url" type="url" placeholder="https://" aria-invalid={Boolean(errors.imageUrl)} {...form.register('imageUrl')} />
            </FormField>
          </div>
          <FormField htmlFor="destination-description" label="Description" error={errors.description?.message}>
            <Textarea id="destination-description" aria-invalid={Boolean(errors.description)} {...form.register('description')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => changeOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : destination ? 'Save changes' : 'Add destination'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
