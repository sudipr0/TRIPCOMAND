import { zodResolver } from '@hookform/resolvers/zod';
import {
  createQuotationSchema, updateQuotationSchema,
  type CreateQuotationInput, type InquiryDetail, type QuotationDetail, type UpdateQuotationInput,
} from '@tripchange/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useAllInquiryCustomers } from '@/features/inquiries/hooks/useInquiries';
import {
  LineItemsEditor, lineItemErrors, newLineItem, type EditableLineItem,
} from '@/features/quotations/components/LineItemsEditor';
import { TagInput } from '@/features/quotations/components/TagInput';
import { useCreateQuotation, useUpdateQuotation } from '@/features/quotations/hooks/useQuotations';
import { fromDateInput, toDateInput, todayInput } from '@/lib/utils';

const CURRENCIES = ['NPR', 'USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'] as const;

const fields = z.object({
  customerId: z.string(),
  trekName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  groupSize: z.string(),
  currency: z.string(),
  discount: z.string(),
  tax: z.string(),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  terms: z.string(),
  notes: z.string(),
  validUntil: z.string(),
});
export type QuotationFormValues = z.infer<typeof fields>;

const num = (value: string) => (value.trim() === '' ? 0 : Number(value));

export function toEditableRows(items: QuotationDetail['lineItems']): EditableLineItem[] {
  return (items ?? []).map((item) => newLineItem({
    category: item.category,
    description: item.description,
    quantity: String(Number(item.quantity)),
    unit: item.unit,
    unitPrice: String(Number(item.unitPrice)),
    isOptional: item.isOptional,
  }));
}

function toLineItems(rows: EditableLineItem[]) {
  return rows.map((row) => ({
    category: row.category.trim(),
    description: row.description.trim(),
    quantity: num(row.quantity),
    unit: row.unit.trim(),
    unitPrice: num(row.unitPrice),
    isOptional: row.isOptional,
  }));
}

export function toCreateInput(values: QuotationFormValues, rows: EditableLineItem[]): CreateQuotationInput {
  return {
    customerId: values.customerId,
    trekName: values.trekName.trim(),
    startDate: fromDateInput(values.startDate),
    endDate: fromDateInput(values.endDate),
    groupSize: Math.trunc(num(values.groupSize)),
    currency: values.currency.trim() || 'NPR',
    discount: num(values.discount),
    tax: num(values.tax),
    inclusions: values.inclusions,
    exclusions: values.exclusions,
    terms: values.terms.trim() || null,
    notes: values.notes.trim() || null,
    validUntil: values.validUntil ? fromDateInput(values.validUntil) : null,
    lineItems: toLineItems(rows),
  };
}

export function toUpdateInput(values: QuotationFormValues, rows: EditableLineItem[]): UpdateQuotationInput {
  const { customerId: _customerId, ...rest } = toCreateInput(values, rows);
  void _customerId;
  return rest;
}

function formSchema(editing: boolean, getRows: () => EditableLineItem[]) {
  return fields.superRefine((values, context) => {
    if (!values.customerId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['customerId'], message: 'Select a customer' });
    }
    if (!values.trekName.trim()) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['trekName'], message: 'Enter the trek name' });
    }
    if (!values.startDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['startDate'], message: 'Choose a start date' });
    }
    if (!values.endDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'Choose an end date' });
    }
    const rows = getRows();
    if (!rows.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['lineItems'], message: 'Add at least one line item' });
    }
    if (editing) {
      const parsed = updateQuotationSchema.safeParse(toUpdateInput(values, rows));
      if (!parsed.success) parsed.error.issues.forEach((issue) => context.addIssue({
        code: z.ZodIssueCode.custom,
        path: issue.path,
        message: issue.message === 'End date must be after start date' ? 'End date must be after the start date' : issue.message,
      }));
    } else {
      const parsed = createQuotationSchema.safeParse(toCreateInput(values, rows));
      if (!parsed.success) parsed.error.issues.forEach((issue) => context.addIssue({
        code: z.ZodIssueCode.custom,
        path: issue.path,
        message: issue.message === 'End date must be after start date' ? 'End date must be after the start date' : issue.message,
      }));
    }
  });
}

export function quotationDefaults(quotation?: QuotationDetail, inquiry?: InquiryDetail): QuotationFormValues {
  return {
    customerId: quotation?.customerId ?? inquiry?.customerId ?? '',
    trekName: quotation?.trekName ?? inquiry?.trekInterest ?? '',
    startDate: toDateInput(quotation?.startDate ?? inquiry?.preferredStart),
    endDate: toDateInput(quotation?.endDate ?? inquiry?.preferredEnd),
    groupSize: String(quotation?.groupSize ?? inquiry?.groupSize ?? 1),
    currency: quotation?.currency ?? inquiry?.budgetCurrency ?? 'NPR',
    discount: quotation ? String(Number(quotation.discount)) : '0',
    tax: quotation ? String(Number(quotation.tax)) : '0',
    inclusions: quotation?.inclusions ?? [],
    exclusions: quotation?.exclusions ?? [],
    terms: quotation?.terms ?? '',
    notes: quotation?.notes ?? '',
    validUntil: toDateInput(quotation?.validUntil),
  };
}

export interface QuotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode: the quotation being edited. */
  quotation?: QuotationDetail;
  /** Create mode: pre-fill from an inquiry and link the new quotation to it. */
  inquiry?: InquiryDetail;
  /** Create mode: pre-select a customer (used by the header "New quotation" button). */
  customerId?: string;
}

/**
 * Create or edit a quotation. Both modes funnel through the same form; only the payload and
 * the primary action differ. In create mode a successful save navigates to the new quotation.
 */
export function QuotationFormDialog({ open, onOpenChange, quotation, inquiry, customerId }: QuotationFormDialogProps) {
  const navigate = useNavigate();
  const editing = Boolean(quotation);
  const customers = useAllInquiryCustomers(open);
  const create = useCreateQuotation();
  const update = useUpdateQuotation(quotation?.id ?? '');
  const pending = create.isPending || update.isPending;

  // Line items live outside react-hook-form so partially typed numbers stay editable.
  // The dialog is re-mounted per record by its callers, so this state is always fresh.
  const [rows, setRows] = useState<EditableLineItem[]>(() => {
    const initial = toEditableRows(quotation?.lineItems);
    return initial.length ? initial : [newLineItem()];
  });
  const defaults = quotationDefaults(quotation, inquiry);
  if (!editing && customerId) defaults.customerId = customerId;

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(formSchema(editing, () => rows)),
    defaultValues: defaults,
  });
  const errors = form.formState.errors;
  const selectedCustomerId = form.watch('customerId');
  const customersError = customers.isError ? 'Could not load customers.' : null;

  function submit(values: QuotationFormValues) {
    // Row-level errors are rendered inline by the editor, but the blocked submit must
    // also be announced — otherwise the dialog appears unresponsive.
    const invalidRows = rows.filter((row) => Object.keys(lineItemErrors(row)).length > 0);
    if (invalidRows.length) {
      toast.error(invalidRows.length === 1
        ? 'Fix the incomplete line item before submitting'
        : `Fix ${invalidRows.length} incomplete line items before submitting`);
      return;
    }
    const onSuccess = (saved: QuotationDetail) => {
      if (!editing) {
        onOpenChange(false);
        navigate(`/quotations/${saved.id}`);
      } else {
        onOpenChange(false);
      }
    };
    if (quotation) {
      update.mutate(toUpdateInput(values, rows), { onSuccess });
    } else {
      create.mutate({ ...toCreateInput(values, rows), ...(inquiry ? { inquiryId: inquiry.id } : {}) }, { onSuccess });
    }
  }

  const selectedCustomer = customers.data?.find((customer) => customer.id === selectedCustomerId);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-32px)] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit quotation' : 'New quotation'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Saving creates a new version snapshot of this quotation.' : 'Build a proposal with line items, dates and terms.'}
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(submit)} className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Customer and trek</h3>
            {inquiry || editing ? (
              <p className="text-sm text-fg-muted">
                Customer: <span className="font-medium text-fg">{quotation?.customer?.fullName ?? selectedCustomer?.fullName ?? 'Customer unavailable'}</span>
                {inquiry ? <span className="ml-2 text-fg-subtle">from {inquiry.inquiryNumber}</span> : null}
              </p>
            ) : (
              <FormField htmlFor="quotation-customer" label="Customer" required error={errors.customerId?.message}>
                <Select id="quotation-customer" value={selectedCustomerId} disabled={customers.isPending || Boolean(customersError)}
                  aria-invalid={Boolean(errors.customerId)} onChange={(event) => form.setValue('customerId', event.target.value, { shouldValidate: true })}>
                  <option value="">{customers.isPending ? 'Loading customers...' : 'Select a customer'}</option>
                  {customers.data?.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.fullName}{customer.email ? ` · ${customer.email}` : ''}</option>
                  ))}
                </Select>
              </FormField>
            )}
            {customersError ? <p role="alert" className="text-xs text-danger">{customersError} <Button type="button" variant="link" onClick={() => customers.refetch()}>Try again</Button></p> : null}
            <FormField htmlFor="quotation-trek" label="Trek" required error={errors.trekName?.message}>
              <Input id="quotation-trek" maxLength={200} aria-invalid={Boolean(errors.trekName)} {...form.register('trekName')} />
            </FormField>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Dates and group</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField htmlFor="quotation-start" label="Start date" required error={errors.startDate?.message}>
                <Input id="quotation-start" type="date" aria-invalid={Boolean(errors.startDate)} {...form.register('startDate')} />
              </FormField>
              <FormField htmlFor="quotation-end" label="End date" required error={errors.endDate?.message}>
                <Input id="quotation-end" type="date" aria-invalid={Boolean(errors.endDate)} {...form.register('endDate')} />
              </FormField>
              <FormField htmlFor="quotation-group" label="Group size" required error={errors.groupSize?.message}>
                <Input id="quotation-group" type="number" min={1} max={500} className="tabular-nums"
                  aria-invalid={Boolean(errors.groupSize)} {...form.register('groupSize')} />
              </FormField>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Pricing</h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="quotation-currency" className="text-xs uppercase tracking-wide text-fg-subtle">Currency</Label>
                <Select id="quotation-currency" className="w-24" {...form.register('currency')}>
                  {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                  {!CURRENCIES.includes(defaults.currency as typeof CURRENCIES[number]) ? <option value={defaults.currency}>{defaults.currency}</option> : null}
                </Select>
              </div>
            </div>
            <LineItemsEditor items={rows} onChange={setRows} currency={form.watch('currency')}
              discount={num(form.watch('discount'))} tax={num(form.watch('tax'))} error={errors.root?.lineItems?.message} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="quotation-discount" label="Discount" error={errors.discount?.message}>
                <Input id="quotation-discount" type="number" min={0} step="any" className="tabular-nums" {...form.register('discount')} />
              </FormField>
              <FormField htmlFor="quotation-tax" label="Tax" error={errors.tax?.message}>
                <Input id="quotation-tax" type="number" min={0} step="any" className="tabular-nums" {...form.register('tax')} />
              </FormField>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Content</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="quotation-inclusions" label="Inclusions" hint="Press Enter to add an item">
                <Controller control={form.control} name="inclusions" render={({ field }) => (
                  <TagInput id="quotation-inclusions" value={field.value} onChange={field.onChange} placeholder="Airport transfers, permits..." />
                )} />
              </FormField>
              <FormField htmlFor="quotation-exclusions" label="Exclusions" hint="Press Enter to add an item">
                <Controller control={form.control} name="exclusions" render={({ field }) => (
                  <TagInput id="quotation-exclusions" value={field.value} onChange={field.onChange} placeholder="Personal gear, tips..." />
                )} />
              </FormField>
            </div>
            <FormField htmlFor="quotation-terms" label="Terms" error={errors.terms?.message}>
              <Textarea id="quotation-terms" rows={3} maxLength={5000} {...form.register('terms')} />
            </FormField>
            <FormField htmlFor="quotation-notes" label="Notes" error={errors.notes?.message}>
              <Textarea id="quotation-notes" rows={2} maxLength={5000} {...form.register('notes')} />
            </FormField>
            <FormField htmlFor="quotation-valid-until" label="Valid until" error={errors.validUntil?.message} hint={`Today is ${todayInput()}`}>
              <Input id="quotation-valid-until" type="date" {...form.register('validUntil')} />
            </FormField>
          </section>

          <DialogFooter>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || (!editing && !inquiry && customers.isPending)}>
              {pending ? 'Saving...' : editing ? 'Save changes' : 'Create quotation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
