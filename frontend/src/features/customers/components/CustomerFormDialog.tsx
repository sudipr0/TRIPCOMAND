import { z } from 'zod';
import { useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { type CustomerDetail } from '@tripchange/shared';
import { updateCustomerSchema } from '@tripchange/shared';
import { type CreateCustomerInput } from '@tripchange/shared';
import { CUSTOMER_TYPES, createCustomerSchema } from '@tripchange/shared';

import { fromDateInput } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { TagInput } from '@/features/trek-templates/components/TagInput';
import { useCreateCustomer, useUpdateCustomer } from '@/features/customers/hooks/useCustomers';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const sources = ['Website', 'Referral', 'Social media', 'Phone', 'Walk-in', 'Other'];

const fields = z.object({
  customerType: z.enum(CUSTOMER_TYPES), fullName: z.string(), email: z.string(), phone: z.string(),
  whatsapp: z.string(), nationality: z.string(), address: z.string(), dateOfBirth: z.string(),
  emergencyContactName: z.string(), emergencyContactPhone: z.string(), source: z.string(),
  tags: z.array(z.string()), notes: z.string(),
});
type Values = z.infer<typeof fields>;

function optional(value: string): string | null {
  return value.trim() || null;
}

function toInput(values: Values): CreateCustomerInput {
  return {
    customerType: values.customerType,
    fullName: values.fullName.trim(),
    email: optional(values.email),
    phone: optional(values.phone),
    whatsapp: optional(values.whatsapp),
    nationality: optional(values.nationality),
    address: optional(values.address),
    dateOfBirth: values.dateOfBirth ? fromDateInput(values.dateOfBirth) : null,
    emergencyContactName: optional(values.emergencyContactName),
    emergencyContactPhone: optional(values.emergencyContactPhone),
    source: optional(values.source),
    tags: values.tags,
    notes: optional(values.notes),
  };
}

function formSchema(editing: boolean) {
  return fields.superRefine((values, context) => {
    if (values.dateOfBirth) {
      const parsedDate = new Date(`${values.dateOfBirth}T00:00:00.000Z`);
      if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== values.dateOfBirth) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['dateOfBirth'], message: 'Enter a valid date of birth' });
        return;
      }
    }
    const result = editing ? updateCustomerSchema.safeParse(toInput(values)) : createCustomerSchema.safeParse(toInput(values));
    if (!result.success) result.error.issues.forEach((issue) => context.addIssue({
      code: z.ZodIssueCode.custom, path: issue.path, message: issue.message,
    }));
  });
}

function defaults(customer?: CustomerDetail): Values {
  return {
    customerType: CUSTOMER_TYPES.find((type) => type === customer?.customerType) ?? 'INDIVIDUAL',
    fullName: customer?.fullName ?? '', email: customer?.email ?? '', phone: customer?.phone ?? '',
    whatsapp: customer?.whatsapp ?? '', nationality: customer?.nationality ?? '',
    address: customer?.address ?? '', dateOfBirth: customer?.dateOfBirth?.slice(0, 10) ?? '',
    emergencyContactName: customer?.emergencyContactName ?? '', emergencyContactPhone: customer?.emergencyContactPhone ?? '',
    source: customer?.source ?? '', tags: customer?.tags ?? [], notes: customer?.notes ?? '',
  };
}

interface CustomerFormDialogProps {
  trigger?: ReactNode;
  customer?: CustomerDetail;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CustomerFormDialog({ trigger, customer, open: controlledOpen, onOpenChange }: CustomerFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const create = useCreateCustomer();
  const update = useUpdateCustomer(customer?.id ?? '');
  const pending = create.isPending || update.isPending;
  const form = useForm<Values>({ resolver: zodResolver(formSchema(Boolean(customer))), defaultValues: defaults(customer) });
  const { errors } = form.formState;

  function setOpen(next: boolean) {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  }

  function changeOpen(next: boolean) {
    if (pending) return;
    form.reset(defaults(customer));
    setOpen(next);
  }

  function submit(values: Values) {
    const input = toInput(values);
    const onSuccess = () => { form.reset(defaults(customer)); setOpen(false); };
    if (customer) update.mutate(input, { onSuccess });
    else create.mutate(input, { onSuccess });
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{customer ? 'Edit customer' : 'Add customer'}</DialogTitle>
        <DialogDescription>{customer ? 'Update this customer’s details.' : 'Add a customer to this workspace.'}</DialogDescription>
      </DialogHeader>
      <form noValidate onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField htmlFor="customer-name" label="Full name" required error={errors.fullName?.message}>
            <Input id="customer-name" maxLength={200} aria-invalid={Boolean(errors.fullName)} {...form.register('fullName')} />
          </FormField>
          <FormField htmlFor="customer-type" label="Customer type" required error={errors.customerType?.message}>
            <Select id="customer-type" aria-invalid={Boolean(errors.customerType)} {...form.register('customerType')}>
              {CUSTOMER_TYPES.map((type) => <option key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</option>)}
            </Select>
          </FormField>
          <FormField htmlFor="customer-email" label="Email" error={errors.email?.message}>
            <Input id="customer-email" type="email" aria-invalid={Boolean(errors.email)} {...form.register('email')} />
          </FormField>
          <FormField htmlFor="customer-phone" label="Phone" error={errors.phone?.message}>
            <Input id="customer-phone" type="tel" maxLength={40} aria-invalid={Boolean(errors.phone)} {...form.register('phone')} />
          </FormField>
          <FormField htmlFor="customer-whatsapp" label="WhatsApp" error={errors.whatsapp?.message}>
            <Input id="customer-whatsapp" type="tel" maxLength={40} aria-invalid={Boolean(errors.whatsapp)} {...form.register('whatsapp')} />
          </FormField>
          <FormField htmlFor="customer-nationality" label="Nationality" error={errors.nationality?.message}>
            <Input id="customer-nationality" maxLength={120} aria-invalid={Boolean(errors.nationality)} {...form.register('nationality')} />
          </FormField>
          <FormField htmlFor="customer-birth" label="Date of birth" error={errors.dateOfBirth?.message}>
            <Input id="customer-birth" type="date" aria-invalid={Boolean(errors.dateOfBirth)} {...form.register('dateOfBirth')} />
          </FormField>
          <FormField htmlFor="customer-source" label="Source" error={errors.source?.message}>
            <Select id="customer-source" aria-invalid={Boolean(errors.source)} {...form.register('source')}>
              <option value="">No source</option>
              {customer?.source && !sources.includes(customer.source) ? <option value={customer.source}>{customer.source}</option> : null}
              {sources.map((source) => <option key={source} value={source}>{source}</option>)}
            </Select>
          </FormField>
        </div>
        <FormField htmlFor="customer-address" label="Address" error={errors.address?.message}>
          <Input id="customer-address" maxLength={500} aria-invalid={Boolean(errors.address)} {...form.register('address')} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField htmlFor="customer-emergency-name" label="Emergency contact name" error={errors.emergencyContactName?.message}>
            <Input id="customer-emergency-name" maxLength={200} aria-invalid={Boolean(errors.emergencyContactName)} {...form.register('emergencyContactName')} />
          </FormField>
          <FormField htmlFor="customer-emergency-phone" label="Emergency contact phone" error={errors.emergencyContactPhone?.message}>
            <Input id="customer-emergency-phone" type="tel" maxLength={40} aria-invalid={Boolean(errors.emergencyContactPhone)} {...form.register('emergencyContactPhone')} />
          </FormField>
        </div>
        <Controller name="tags" control={form.control} render={({ field }) =>
          <FormField htmlFor="customer-tags" label="Tags" error={errors.tags?.message}>
            <TagInput id="customer-tags" value={field.value} onChange={field.onChange} placeholder="Type a tag and press Enter" />
          </FormField>
        } />
        <FormField htmlFor="customer-notes" label="Notes" error={errors.notes?.message}>
          <Textarea id="customer-notes" aria-invalid={Boolean(errors.notes)} {...form.register('notes')} />
        </FormField>
        <DialogFooter className="justify-between">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => changeOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? 'Saving...' : customer ? 'Save changes' : 'Add customer'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
