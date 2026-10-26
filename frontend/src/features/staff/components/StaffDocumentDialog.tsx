import { z } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStaffDocumentSchema, type CreateStaffDocumentInput } from '@trailcomand/shared';

import { fromDateInput } from '@/lib/utils';
import { AddIcon } from '@/components/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useCreateStaffDocument } from '@/features/staff/hooks/useStaff';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const fields = z.object({
  documentType: z.string(),
  title: z.string(),
  fileUrl: z.string(),
  fileName: z.string(),
  expiresAt: z.string(),
  notes: z.string(),
});
type Values = z.infer<typeof fields>;

function toInput(values: Values): CreateStaffDocumentInput {
  return {
    documentType: values.documentType.trim(),
    title: values.title.trim(),
    fileUrl: values.fileUrl.trim(),
    ...(values.fileName.trim() ? { fileName: values.fileName.trim() } : {}),
    ...(values.expiresAt ? { expiresAt: new Date(fromDateInput(values.expiresAt)) } : {}),
    ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
  };
}

const schema = fields.superRefine((values, context) => {
  const parsed = createStaffDocumentSchema.safeParse(toInput(values));
  if (!parsed.success) parsed.error.issues.forEach((issue) => context.addIssue({ code: z.ZodIssueCode.custom, path: issue.path, message: issue.message }));
});

export function StaffDocumentDialog({ staffId }: { staffId: string }) {
  const [open, setOpen] = useState(false);
  const create = useCreateStaffDocument(staffId);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { documentType: 'license', title: '', fileUrl: '', fileName: '', expiresAt: '', notes: '' },
  });
  const { errors } = form.formState;
  const submit = (values: Values) => create.mutate(toInput(values), {
    onSuccess: () => { form.reset(); setOpen(false); },
  });

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!create.isPending) { setOpen(next); if (!next) form.reset(); } }}>
      <DialogTrigger asChild><Button size="sm"><AddIcon size={16} />Add document</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add staff document</DialogTitle>
          <DialogDescription>Enter a link to a document already hosted online.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <FormField htmlFor="document-type" label="Document type" required error={errors.documentType?.message}>
            <Select id="document-type" aria-invalid={Boolean(errors.documentType)} {...form.register('documentType')}>
              <option value="license">License</option>
              <option value="passport">Passport</option>
              <option value="insurance">Insurance</option>
              <option value="certification">Certification</option>
              <option value="other">Other</option>
            </Select>
          </FormField>
          <FormField htmlFor="document-title" label="Title" required error={errors.title?.message}>
            <Input id="document-title" aria-invalid={Boolean(errors.title)} {...form.register('title')} />
          </FormField>
          <FormField htmlFor="document-url" label="Document URL" required error={errors.fileUrl?.message}>
            <Input id="document-url" type="url" placeholder="https://" aria-invalid={Boolean(errors.fileUrl)} {...form.register('fileUrl')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="document-file-name" label="File name" error={errors.fileName?.message}>
              <Input id="document-file-name" aria-invalid={Boolean(errors.fileName)} {...form.register('fileName')} />
            </FormField>
            <FormField htmlFor="document-expiry" label="Expires on" error={errors.expiresAt?.message}>
              <Input id="document-expiry" type="date" aria-invalid={Boolean(errors.expiresAt)} {...form.register('expiresAt')} />
            </FormField>
          </div>
          <FormField htmlFor="document-notes" label="Notes" error={errors.notes?.message}>
            <Textarea id="document-notes" aria-invalid={Boolean(errors.notes)} {...form.register('notes')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={create.isPending} onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add document'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
