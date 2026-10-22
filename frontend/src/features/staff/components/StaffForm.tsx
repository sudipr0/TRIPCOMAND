import { zodResolver } from '@hookform/resolvers/zod';
import {
  STAFF_STATUSES, STAFF_TYPES, createStaffSchema, staffStatusSchema, staffTypeSchema,
  updateStaffSchema, type CreateStaffInput, type StaffProfileDetail, type UpdateStaffInput,
} from '@tripchange/shared';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { staffStatusLabel, staffTypeLabel } from '@/features/staff/components/StaffStatusBadge';
import { TagInput } from '@/features/trek-templates/components/TagInput';

const fields = z.object({
  staffType: staffTypeSchema,
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  whatsapp: z.string(),
  photoUrl: z.string(),
  licenseNumber: z.string(),
  licenseExpiry: z.string(),
  languages: z.array(z.string()),
  certifications: z.array(z.string()),
  experienceYears: z.string(),
  experienceLevel: z.string(),
  preferredRoutes: z.array(z.string()),
  emergencyContactName: z.string(),
  emergencyContactPhone: z.string(),
  status: staffStatusSchema,
  notes: z.string(),
});
export type StaffFormValues = z.infer<typeof fields>;

const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);

export function toCreateStaffInput(values: StaffFormValues): CreateStaffInput {
  return {
    staffType: values.staffType,
    fullName: values.fullName.trim(),
    status: values.status,
    languages: values.languages,
    certifications: values.certifications,
    preferredRoutes: values.preferredRoutes,
    ...(values.email.trim() ? { email: values.email.trim() } : {}),
    ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
    ...(values.whatsapp.trim() ? { whatsapp: values.whatsapp.trim() } : {}),
    ...(values.photoUrl.trim() ? { photoUrl: values.photoUrl.trim() } : {}),
    ...(values.licenseNumber.trim() ? { licenseNumber: values.licenseNumber.trim() } : {}),
    ...(values.licenseExpiry ? { licenseExpiry: dateValue(values.licenseExpiry) } : {}),
    ...(values.experienceYears.trim() ? { experienceYears: Number(values.experienceYears) } : {}),
    ...(values.experienceLevel.trim() ? { experienceLevel: values.experienceLevel.trim() } : {}),
    ...(values.emergencyContactName.trim() ? { emergencyContactName: values.emergencyContactName.trim() } : {}),
    ...(values.emergencyContactPhone.trim() ? { emergencyContactPhone: values.emergencyContactPhone.trim() } : {}),
    ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
  };
}

export function toUpdateStaffInput(values: StaffFormValues): UpdateStaffInput {
  return {
    ...toCreateStaffInput(values),
    email: values.email.trim() || null,
    phone: values.phone.trim() || null,
    whatsapp: values.whatsapp.trim() || null,
    photoUrl: values.photoUrl.trim() || null,
    licenseNumber: values.licenseNumber.trim() || null,
    licenseExpiry: values.licenseExpiry ? dateValue(values.licenseExpiry) : null,
    experienceYears: values.experienceYears.trim() ? Number(values.experienceYears) : null,
    experienceLevel: values.experienceLevel.trim() || null,
    emergencyContactName: values.emergencyContactName.trim() || null,
    emergencyContactPhone: values.emergencyContactPhone.trim() || null,
    notes: values.notes.trim() || null,
  };
}

function formSchema(editing: boolean) {
  return fields.superRefine((values, context) => {
    const parsed = editing
      ? updateStaffSchema.safeParse(toUpdateStaffInput(values))
      : createStaffSchema.safeParse(toCreateStaffInput(values));
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => context.addIssue({
        code: z.ZodIssueCode.custom, path: issue.path, message: issue.message,
      }));
    }
  });
}

function defaults(staff?: StaffProfileDetail): StaffFormValues {
  return {
    staffType: staffTypeSchema.safeParse(staff?.staffType).success ? staff!.staffType as StaffFormValues['staffType'] : 'GUIDE',
    fullName: staff?.fullName ?? '',
    email: staff?.email ?? '',
    phone: staff?.phone ?? '',
    whatsapp: staff?.whatsapp ?? '',
    photoUrl: staff?.photoUrl ?? '',
    licenseNumber: staff?.licenseNumber ?? '',
    licenseExpiry: staff?.licenseExpiry?.slice(0, 10) ?? '',
    languages: staff?.languages ?? [],
    certifications: staff?.certifications ?? [],
    experienceYears: staff?.experienceYears?.toString() ?? '',
    experienceLevel: staff?.experienceLevel ?? '',
    preferredRoutes: staff?.preferredRoutes ?? [],
    emergencyContactName: staff?.emergencyContactName ?? '',
    emergencyContactPhone: staff?.emergencyContactPhone ?? '',
    status: staffStatusSchema.safeParse(staff?.status).success ? staff!.status as StaffFormValues['status'] : 'AVAILABLE',
    notes: staff?.notes ?? '',
  };
}

interface StaffFormProps {
  staff?: StaffProfileDetail;
  pending: boolean;
  onSubmit: (values: StaffFormValues) => void;
  onCancel?: () => void;
}

export function StaffForm({ staff, pending, onSubmit, onCancel }: StaffFormProps) {
  const form = useForm<StaffFormValues>({ resolver: zodResolver(formSchema(Boolean(staff))), defaultValues: defaults(staff) });
  const { errors } = form.formState;
  const textField = (name: Exclude<keyof StaffFormValues, 'languages' | 'certifications' | 'preferredRoutes' | 'staffType' | 'status'>, label: string, options?: { type?: string; required?: boolean; hint?: string }) => (
    <FormField htmlFor={`staff-${name}`} label={label} required={options?.required} hint={options?.hint} error={errors[name]?.message}>
      <Input id={`staff-${name}`} type={options?.type ?? 'text'} aria-invalid={Boolean(errors[name])} {...form.register(name)} />
    </FormField>
  );
  const tagField = (name: 'languages' | 'certifications' | 'preferredRoutes', label: string, placeholder: string) => (
    <div className="space-y-2">
      <Label htmlFor={`staff-${name}`}>{label}</Label>
      <TagInput id={`staff-${name}`} value={form.watch(name)} onChange={(value: string[]) => form.setValue(name, value, { shouldValidate: true, shouldDirty: true })} placeholder={placeholder} />
      {errors[name] ? <p className="text-xs text-danger">{errors[name]?.message}</p> : null}
    </div>
  );

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {textField('fullName', 'Full name', { required: true })}
            <FormField htmlFor="staff-staffType" label="Staff type" required error={errors.staffType?.message}>
              <Select id="staff-staffType" value={form.watch('staffType')} onChange={(event) => form.setValue('staffType', event.target.value as StaffFormValues['staffType'], { shouldValidate: true, shouldDirty: true })}>
                {STAFF_TYPES.map((type) => <option key={type} value={type}>{staffTypeLabel(type)}</option>)}
              </Select>
            </FormField>
            {textField('email', 'Email', { type: 'email' })}
            {textField('phone', 'Phone', { type: 'tel' })}
            {textField('whatsapp', 'WhatsApp', { type: 'tel' })}
            {textField('photoUrl', 'Photo URL', { type: 'url' })}
            <FormField htmlFor="staff-status" label="Status" error={errors.status?.message}>
              <Select id="staff-status" value={form.watch('status')} onChange={(event) => form.setValue('status', event.target.value as StaffFormValues['status'], { shouldValidate: true, shouldDirty: true })}>
                {STAFF_STATUSES.map((status) => <option key={status} value={status}>{staffStatusLabel(status)}</option>)}
              </Select>
            </FormField>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Qualifications</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {textField('licenseNumber', 'License number')}
            {textField('licenseExpiry', 'License expiry', { type: 'date' })}
            {textField('experienceYears', 'Years of experience', { type: 'number', hint: 'Between 0 and 80 years' })}
            {textField('experienceLevel', 'Experience level')}
          </div>
          {tagField('languages', 'Languages', 'Add a language')}
          {tagField('certifications', 'Certifications', 'Add a certification')}
          {tagField('preferredRoutes', 'Preferred routes', 'Add a route')}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Emergency contact & notes</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {textField('emergencyContactName', 'Contact name')}
            {textField('emergencyContactPhone', 'Contact phone', { type: 'tel' })}
          </div>
          <FormField htmlFor="staff-notes" label="Notes" error={errors.notes?.message}>
            <Textarea id="staff-notes" aria-invalid={Boolean(errors.notes)} {...form.register('notes')} />
          </FormField>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {onCancel
          ? <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>Cancel</Button>
          : <Button variant="secondary" asChild><Link to={staff ? `/staff/${staff.id}` : '/staff'}>Cancel</Link></Button>}
        <Button type="submit" disabled={pending}>{pending ? 'Saving...' : staff ? 'Save changes' : 'Create staff member'}</Button>
      </div>
    </form>
  );
}
