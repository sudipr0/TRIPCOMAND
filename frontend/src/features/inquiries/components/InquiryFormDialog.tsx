import { zodResolver } from '@hookform/resolvers/zod';
import { createInquirySchema, INQUIRY_PRIORITIES, INQUIRY_STATUSES, updateInquirySchema, type CreateInquiryInput, type InquiryDetail, type UpdateInquiryInput } from '@tripchange/shared';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useAllInquiryCustomers, useCreateInquiry, useInquiryMembers, useUpdateInquiry } from '@/features/inquiries/hooks/useInquiries';

const fields = z.object({
  customerId: z.string(), trekInterest: z.string(), destinationText: z.string(),
  preferredStart: z.string(), preferredEnd: z.string(), flexibleDates: z.boolean(),
  groupSize: z.string(), adults: z.string(), children: z.string(),
  specialRequirements: z.string(), budgetExpectation: z.string(), budgetCurrency: z.string(),
  priority: z.enum(INQUIRY_PRIORITIES), status: z.enum(INQUIRY_STATUSES), assignedToId: z.string(),
  source: z.string(), nextFollowUpAt: z.string(), notes: z.string(),
});
type Values = z.infer<typeof fields>;

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

const optional = (value: string) => value.trim() || null;

function toCreateInput(values: Values): CreateInquiryInput {
  return {
    customerId: values.customerId, trekInterest: optional(values.trekInterest), destinationText: optional(values.destinationText),
    preferredStart: toIso(values.preferredStart), preferredEnd: toIso(values.preferredEnd), flexibleDates: values.flexibleDates,
    groupSize: Number(values.groupSize), adults: Number(values.adults), children: Number(values.children),
    specialRequirements: optional(values.specialRequirements), budgetExpectation: values.budgetExpectation === '' ? null : Number(values.budgetExpectation),
    budgetCurrency: values.budgetCurrency.trim(), priority: values.priority, source: optional(values.source),
    nextFollowUpAt: toIso(values.nextFollowUpAt), notes: optional(values.notes),
  };
}

function schema(editing: boolean) {
  return fields.superRefine((values, context) => {
    for (const field of ['preferredStart', 'preferredEnd', 'nextFollowUpAt'] as const) {
      const input = values[field];
      if (input && (!Number.isFinite(new Date(input).getTime()) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Enter a valid date and time' });
      }
    }
    const input = toCreateInput(values);
    if (input.preferredStart && input.preferredEnd && new Date(input.preferredEnd) < new Date(input.preferredStart)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['preferredEnd'], message: 'End must be on or after start' });
    }
    const result = (editing ? updateInquirySchema : createInquirySchema).safeParse(editing ? toUpdateInput(input, values) : input);
    if (!result.success) result.error.issues.forEach((issue) => context.addIssue({
      code: z.ZodIssueCode.custom, path: issue.path, message: issue.message,
    }));
  });
}

function toUpdateInput(input: CreateInquiryInput, values: Values): UpdateInquiryInput {
  return {
    trekInterest: input.trekInterest, destinationText: input.destinationText, preferredStart: input.preferredStart,
    preferredEnd: input.preferredEnd, flexibleDates: input.flexibleDates, groupSize: input.groupSize,
    adults: input.adults, children: input.children, specialRequirements: input.specialRequirements,
    budgetExpectation: input.budgetExpectation, budgetCurrency: input.budgetCurrency, priority: input.priority,
    source: input.source, nextFollowUpAt: input.nextFollowUpAt, notes: input.notes,
    status: values.status, assignedToId: values.assignedToId || null,
  };
}

function defaults(customerId?: string, inquiry?: InquiryDetail): Values {
  return {
    customerId: customerId ?? inquiry?.customerId ?? '', trekInterest: inquiry?.trekInterest ?? '',
    destinationText: inquiry?.destinationText ?? '', preferredStart: toLocalInput(inquiry?.preferredStart),
    preferredEnd: toLocalInput(inquiry?.preferredEnd), flexibleDates: inquiry?.flexibleDates ?? true,
    groupSize: String(inquiry?.groupSize ?? 1), adults: String(inquiry?.adults ?? 1), children: String(inquiry?.children ?? 0),
    specialRequirements: inquiry?.specialRequirements ?? '', budgetExpectation: inquiry?.budgetExpectation ?? '',
    budgetCurrency: inquiry?.budgetCurrency ?? 'NPR', priority: INQUIRY_PRIORITIES.find((p) => p === inquiry?.priority) ?? 'LOW',
    status: INQUIRY_STATUSES.find((s) => s === inquiry?.status) ?? 'NEW', assignedToId: inquiry?.assignedToId ?? '',
    source: inquiry?.source ?? '', nextFollowUpAt: toLocalInput(inquiry?.nextFollowUpAt), notes: inquiry?.notes ?? '',
  };
}

export function InquiryFormDialog({ trigger, customerId, inquiry, open: controlledOpen, onOpenChange }: {
  trigger: ReactNode; customerId?: string; inquiry?: InquiryDetail; open?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [customerSearch, setCustomerSearch] = useState('');
  const customers = useAllInquiryCustomers(open);
  const members = useInquiryMembers();
  const selectedCustomer = customers.data?.find((item) => item.id === (customerId ?? inquiry?.customerId));
  const create = useCreateInquiry();
  const update = useUpdateInquiry(inquiry?.id ?? '');
  const pending = create.isPending || update.isPending;
  const form = useForm<Values>({ resolver: zodResolver(schema(Boolean(inquiry))), defaultValues: defaults(customerId, inquiry) });
  const errors = form.formState.errors;
  const customerOptions = customers.data?.filter((customer) => customer.fullName.toLowerCase().includes(customerSearch.trim().toLowerCase()) || customer.email?.toLowerCase().includes(customerSearch.trim().toLowerCase())) ?? [];
  const selectedId = form.watch('customerId');

  function setOpen(next: boolean) {
    if (onOpenChange) onOpenChange(next);
    else setInternalOpen(next);
  }

  function changeOpen(next: boolean) {
    if (pending) return;
    form.reset(defaults(customerId, inquiry));
    setCustomerSearch('');
    setOpen(next);
  }

  function submit(values: Values) {
    const input = toCreateInput(values);
    const onSuccess = () => { form.reset(defaults(customerId, inquiry)); setCustomerSearch(''); setOpen(false); };
    if (inquiry) update.mutate(toUpdateInput(input, values), { onSuccess });
    else create.mutate(input, { onSuccess });
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>{inquiry ? 'Edit inquiry' : 'New inquiry'}</DialogTitle>
        <DialogDescription>{inquiry ? 'Update inquiry details.' : 'Record a customer request.'}</DialogDescription></DialogHeader>
      <form noValidate onSubmit={form.handleSubmit(submit)} className="space-y-5">
        {customerId || inquiry ? <div className="text-sm text-fg-muted">Customer: <span className="font-medium text-fg">{selectedCustomer?.fullName ?? (customers.isPending ? 'Loading customer...' : 'Customer unavailable')}</span></div> : <div className="space-y-3">
          <FormField htmlFor="inquiry-customer-search" label="Find customer"><Input id="inquiry-customer-search" placeholder="Search by name or email" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} /></FormField>
          <FormField htmlFor="inquiry-customer" label="Customer" required error={errors.customerId?.message}>
            <Select id="inquiry-customer" aria-invalid={Boolean(errors.customerId)} disabled={customers.isPending || customers.isError} value={selectedId} onChange={(event) => form.setValue('customerId', event.target.value, { shouldValidate: true })}>
              <option value="">{customers.isPending ? 'Loading customers...' : 'Select a customer'}</option>
              {customers.data?.find((customer) => customer.id === selectedId) && !customerOptions.some((customer) => customer.id === selectedId) ? <option value={selectedId}>{customers.data.find((customer) => customer.id === selectedId)?.fullName}</option> : null}
              {customerOptions.map((customer) => <option key={customer.id} value={customer.id}>{customer.fullName}{customer.email ? ` · ${customer.email}` : ''}</option>)}
            </Select>
          </FormField>
          {customers.isError ? <p role="alert" className="text-sm text-danger">Could not load customers. <Button type="button" variant="link" onClick={() => customers.refetch()}>Try again</Button></p> : null}
          {customers.data?.length === 0 ? <p className="text-sm text-fg-muted">Add a customer first.</p> : null}
        </div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField htmlFor="inquiry-interest" label="Trek interest" error={errors.trekInterest?.message}><Input id="inquiry-interest" maxLength={200} {...form.register('trekInterest')} /></FormField>
          <FormField htmlFor="inquiry-destination" label="Destination" error={errors.destinationText?.message}><Input id="inquiry-destination" maxLength={200} {...form.register('destinationText')} /></FormField>
          <FormField htmlFor="inquiry-start" label="Preferred start" error={errors.preferredStart?.message}><Input id="inquiry-start" type="datetime-local" aria-invalid={Boolean(errors.preferredStart)} {...form.register('preferredStart')} /></FormField>
          <FormField htmlFor="inquiry-end" label="Preferred end" error={errors.preferredEnd?.message}><Input id="inquiry-end" type="datetime-local" aria-invalid={Boolean(errors.preferredEnd)} {...form.register('preferredEnd')} /></FormField>
          <FormField htmlFor="inquiry-group" label="Group size" error={errors.groupSize?.message}><Input id="inquiry-group" type="number" min={1} max={500} aria-invalid={Boolean(errors.groupSize)} {...form.register('groupSize')} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField htmlFor="inquiry-adults" label="Adults" error={errors.adults?.message}><Input id="inquiry-adults" type="number" min={0} max={500} {...form.register('adults')} /></FormField>
            <FormField htmlFor="inquiry-children" label="Children" error={errors.children?.message}><Input id="inquiry-children" type="number" min={0} max={500} {...form.register('children')} /></FormField>
          </div>
          <FormField htmlFor="inquiry-budget" label="Budget expectation" error={errors.budgetExpectation?.message}><Input id="inquiry-budget" type="number" min={0} step="0.01" {...form.register('budgetExpectation')} /></FormField>
          <FormField htmlFor="inquiry-currency" label="Currency" error={errors.budgetCurrency?.message}><Input id="inquiry-currency" maxLength={10} {...form.register('budgetCurrency')} /></FormField>
          <FormField htmlFor="inquiry-priority" label="Priority" error={errors.priority?.message}><Select id="inquiry-priority" {...form.register('priority')}>{INQUIRY_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</Select></FormField>
          {inquiry ? <><FormField htmlFor="inquiry-status" label="Status" error={errors.status?.message}>
            <Select id="inquiry-status" {...form.register('status')}>{INQUIRY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</Select>
          </FormField><FormField htmlFor="inquiry-assigned" label="Assigned to" error={errors.assignedToId?.message}>
            <Select id="inquiry-assigned" disabled={members.isPending || members.isError} {...form.register('assignedToId')}>
              <option value="">Unassigned</option>
              {inquiry.assignedToId && !members.data?.some((member) => member.userId === inquiry.assignedToId)
                ? <option value={inquiry.assignedToId}>Member unavailable</option> : null}
              {members.data?.filter((member) => member.status === 'ACTIVE' && member.user.status === 'ACTIVE').map((member) =>
                <option key={member.userId} value={member.userId}>{member.user.firstName} {member.user.lastName}</option>)}
            </Select>
          </FormField></> : null}
          <FormField htmlFor="inquiry-source" label="Source" error={errors.source?.message}><Input id="inquiry-source" maxLength={120} {...form.register('source')} /></FormField>
          <FormField htmlFor="inquiry-followup" label="Next follow-up" error={errors.nextFollowUpAt?.message}><Input id="inquiry-followup" type="datetime-local" aria-invalid={Boolean(errors.nextFollowUpAt)} {...form.register('nextFollowUpAt')} /></FormField>
          <Controller control={form.control} name="flexibleDates" render={({ field }) => <div className="flex items-center gap-3 pt-6"><Switch id="inquiry-flexible" checked={field.value} onCheckedChange={field.onChange} /><label htmlFor="inquiry-flexible" className="text-sm text-fg">Flexible dates</label></div>} />
        </div>
        <FormField htmlFor="inquiry-requirements" label="Special requirements" error={errors.specialRequirements?.message}><Textarea id="inquiry-requirements" maxLength={2000} {...form.register('specialRequirements')} /></FormField>
        <FormField htmlFor="inquiry-notes" label="Notes" error={errors.notes?.message}><Textarea id="inquiry-notes" {...form.register('notes')} /></FormField>
        <DialogFooter><Button type="button" variant="secondary" disabled={pending} onClick={() => changeOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={pending || (!inquiry && !customerId && (!customers.data || customers.isError))}>{pending ? 'Saving...' : inquiry ? 'Save changes' : 'Create inquiry'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
