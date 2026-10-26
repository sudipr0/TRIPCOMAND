import { SUPPLIER_CATEGORIES, SUPPLIER_STATUSES, type SupplierCategory, type SupplierDetail, type SupplierStatus } from '@trailcomand/shared';
import { useState } from 'react';

import { StarIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useCreateSupplier, useUpdateSupplier } from '@/features/suppliers/hooks/useSuppliers';
import { cn } from '@/lib/utils';

const orNull = (value: string) => (value.trim() ? value.trim() : null);
const title = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace('_', ' ');

export function SupplierFormDialog({ supplier, open, onOpenChange }: {
  supplier?: SupplierDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = Boolean(supplier);
  const create = useCreateSupplier();
  const update = useUpdateSupplier(supplier?.id ?? '');
  const pending = create.isPending || update.isPending;

  const [name, setName] = useState(supplier?.name ?? '');
  const [code, setCode] = useState(supplier?.code ?? '');
  const [category, setCategory] = useState<SupplierCategory>((supplier?.category as SupplierCategory) ?? 'ACCOMMODATION');
  const [region, setRegion] = useState(supplier?.region ?? '');
  const [contactName, setContactName] = useState(supplier?.contactName ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(supplier?.whatsapp ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [taxId, setTaxId] = useState(supplier?.taxId ?? '');
  const [paymentTerms, setPaymentTerms] = useState(supplier?.paymentTerms ?? '');
  const [currency, setCurrency] = useState(supplier?.currency ?? 'NPR');
  const [rating, setRating] = useState<number>(supplier?.rating ?? 0);
  const [status, setStatus] = useState<SupplierStatus>((supplier?.status as SupplierStatus) ?? 'ACTIVE');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [error, setError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Enter a valid email address'); return; }
    setError('');
    const payload = {
      name: name.trim(),
      code: orNull(code),
      category,
      region: orNull(region),
      contactName: orNull(contactName),
      email: orNull(email),
      phone: orNull(phone),
      whatsapp: orNull(whatsapp),
      address: orNull(address),
      taxId: orNull(taxId),
      paymentTerms: orNull(paymentTerms),
      currency,
      rating: rating > 0 ? rating : null,
      status,
      notes: orNull(notes),
    };
    const done = { onSuccess: () => onOpenChange(false) };
    if (supplier) update.mutate(payload as never, done);
    else create.mutate(payload as never, done);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit supplier' : 'Add supplier'}</DialogTitle>
          <DialogDescription>Lodges, transport providers, permits and other service suppliers.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Basic</h3>
            <FormField htmlFor="supplier-name" label="Name" required>
              <Input id="supplier-name" maxLength={200} value={name} onChange={(event) => setName(event.target.value)} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField htmlFor="supplier-code" label="Code">
                <Input id="supplier-code" maxLength={50} value={code} onChange={(event) => setCode(event.target.value)} />
              </FormField>
              <FormField htmlFor="supplier-category" label="Category" required>
                <Select id="supplier-category" value={category} onChange={(event) => setCategory(event.target.value as SupplierCategory)}>
                  {SUPPLIER_CATEGORIES.map((option) => <option key={option} value={option}>{title(option)}</option>)}
                </Select>
              </FormField>
              <FormField htmlFor="supplier-region" label="Region">
                <Input id="supplier-region" maxLength={100} value={region} onChange={(event) => setRegion(event.target.value)} />
              </FormField>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Contact</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="supplier-contact" label="Contact name">
                <Input id="supplier-contact" maxLength={100} value={contactName} onChange={(event) => setContactName(event.target.value)} />
              </FormField>
              <FormField htmlFor="supplier-email" label="Email">
                <Input id="supplier-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </FormField>
              <FormField htmlFor="supplier-phone" label="Phone">
                <Input id="supplier-phone" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} />
              </FormField>
              <FormField htmlFor="supplier-whatsapp" label="WhatsApp">
                <Input id="supplier-whatsapp" maxLength={40} value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} />
              </FormField>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-address">Address</Label>
              <Textarea id="supplier-address" maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Business</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField htmlFor="supplier-tax" label="Tax ID">
                <Input id="supplier-tax" maxLength={50} value={taxId} onChange={(event) => setTaxId(event.target.value)} />
              </FormField>
              <FormField htmlFor="supplier-terms" label="Payment terms">
                <Input id="supplier-terms" maxLength={200} value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} />
              </FormField>
              <FormField htmlFor="supplier-currency" label="Currency">
                <Select id="supplier-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="NPR">NPR</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </Select>
              </FormField>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-fg-muted">Rating</span>
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} star`}
                    onClick={() => setRating(rating === value ? 0 : value)}
                    className={cn('rounded-sm p-0.5 transition-colors duration-fast', value <= rating ? 'text-warning' : 'text-fg-subtle hover:text-fg-muted')}>
                    <StarIcon size={18} weight={value <= rating ? 'fill' : 'regular'} />
                  </button>
                ))}
                <button type="button" onClick={() => setRating(0)} className="ml-2 text-xs text-fg-subtle hover:text-fg">
                  Clear
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Status and notes</h3>
            <FormField htmlFor="supplier-status" label="Status">
              <Select id="supplier-status" value={status} onChange={(event) => setStatus(event.target.value as SupplierStatus)}>
                {SUPPLIER_STATUSES.map((option) => <option key={option} value={option}>{title(option)}</option>)}
              </Select>
            </FormField>
            <div className="space-y-2">
              <Label htmlFor="supplier-notes">Notes</Label>
              <Textarea id="supplier-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </section>

          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : editing ? 'Save supplier' : 'Create supplier'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
