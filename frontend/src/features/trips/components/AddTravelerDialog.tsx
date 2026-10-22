import type { TripTravelerDetail } from '@tripchange/shared';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/features/auth/components/FormField';
import { useAddTraveler, useUpdateTraveler } from '@/features/trips/hooks/useTrips';
import { toDateInput, fromDateInput } from '@/lib/utils';

interface TravelerFormProps {
  tripId: string;
  traveler?: TripTravelerDetail;
  hasExistingLeader: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isoOrNull = (value: string) => (value ? fromDateInput(value) : null);
const orNull = (value: string) => (value.trim() ? value.trim() : null);

export function AddTravelerDialog({ tripId, traveler, hasExistingLeader, open, onOpenChange }: TravelerFormProps) {
  const editing = Boolean(traveler);
  const add = useAddTraveler(tripId);
  const update = useUpdateTraveler(tripId);
  const pending = add.isPending || update.isPending;
  const [fullName, setFullName] = useState(traveler?.fullName ?? '');
  const [email, setEmail] = useState(traveler?.email ?? '');
  const [phone, setPhone] = useState(traveler?.phone ?? '');
  const [nationality, setNationality] = useState(traveler?.nationality ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(traveler?.dateOfBirth ? toDateInput(traveler.dateOfBirth) : '');
  const [passportNumber, setPassportNumber] = useState(traveler?.passportNumber ?? '');
  const [passportExpiry, setPassportExpiry] = useState(traveler?.passportExpiry ? toDateInput(traveler.passportExpiry) : '');
  const [emergencyContactName, setEmergencyContactName] = useState(traveler?.emergencyContactName ?? '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(traveler?.emergencyContactPhone ?? '');
  const [dietaryRequirements, setDietaryRequirements] = useState(traveler?.dietaryRequirements ?? '');
  const [medicalNotes, setMedicalNotes] = useState(traveler?.medicalNotes ?? '');
  const [insuranceProvider, setInsuranceProvider] = useState(traveler?.insuranceProvider ?? '');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState(traveler?.insurancePolicyNumber ?? '');
  const [isTripLeader, setIsTripLeader] = useState(traveler?.isTripLeader ?? false);
  const [notes, setNotes] = useState(traveler?.notes ?? '');
  const [error, setError] = useState('');

  const leaderTaken = hasExistingLeader && !traveler?.isTripLeader;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!fullName.trim()) { setError('Full name is required'); return; }
    if (email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setError('Enter a valid email address'); return; }
    if (leaderTaken && isTripLeader) {
      setError('This trip already has a leader. Clear the existing leader first.');
      toast.error('This trip already has a trip leader');
      return;
    }
    setError('');
    const payload = {
      fullName: fullName.trim(),
      email: orNull(email),
      phone: orNull(phone),
      nationality: orNull(nationality),
      dateOfBirth: isoOrNull(dateOfBirth),
      passportNumber: orNull(passportNumber),
      passportExpiry: isoOrNull(passportExpiry),
      emergencyContactName: orNull(emergencyContactName),
      emergencyContactPhone: orNull(emergencyContactPhone),
      dietaryRequirements: orNull(dietaryRequirements),
      medicalNotes: orNull(medicalNotes),
      insuranceProvider: orNull(insuranceProvider),
      insurancePolicyNumber: orNull(insurancePolicyNumber),
      isTripLeader,
      notes: orNull(notes),
    };
    const done = { onSuccess: () => onOpenChange(false) };
    if (traveler) update.mutate({ travelerId: traveler.id, input: payload }, done);
    else add.mutate(payload, done);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit traveler' : 'Add traveler'}</DialogTitle>
          <DialogDescription>Traveler details are used for permits, insurance and emergency contacts.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-6">
          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Basic</h3>
            <FormField htmlFor="traveler-name" label="Full name" required>
              <Input id="traveler-name" maxLength={200} value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="traveler-email" label="Email">
                <Input id="traveler-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </FormField>
              <FormField htmlFor="traveler-phone" label="Phone">
                <Input id="traveler-phone" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} />
              </FormField>
              <FormField htmlFor="traveler-nationality" label="Nationality">
                <Input id="traveler-nationality" maxLength={80} value={nationality} onChange={(event) => setNationality(event.target.value)} />
              </FormField>
              <FormField htmlFor="traveler-dob" label="Date of birth">
                <Input id="traveler-dob" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} />
              </FormField>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Documents</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="traveler-passport" label="Passport number">
                <Input id="traveler-passport" maxLength={40} value={passportNumber} onChange={(event) => setPassportNumber(event.target.value)} />
              </FormField>
              <FormField htmlFor="traveler-passport-expiry" label="Passport expiry">
                <Input id="traveler-passport-expiry" type="date" value={passportExpiry} onChange={(event) => setPassportExpiry(event.target.value)} />
              </FormField>
              <FormField htmlFor="traveler-insurance-provider" label="Insurance provider">
                <Input id="traveler-insurance-provider" maxLength={200} value={insuranceProvider} onChange={(event) => setInsuranceProvider(event.target.value)} />
              </FormField>
              <FormField htmlFor="traveler-insurance-policy" label="Policy number">
                <Input id="traveler-insurance-policy" maxLength={60} value={insurancePolicyNumber} onChange={(event) => setInsurancePolicyNumber(event.target.value)} />
              </FormField>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Emergency and medical</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="traveler-emergency-name" label="Emergency contact">
                <Input id="traveler-emergency-name" maxLength={200} value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} />
              </FormField>
              <FormField htmlFor="traveler-emergency-phone" label="Emergency phone">
                <Input id="traveler-emergency-phone" maxLength={40} value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} />
              </FormField>
            </div>
            <div className="space-y-2">
              <Label htmlFor="traveler-dietary">Dietary requirements</Label>
              <Textarea id="traveler-dietary" maxLength={1000} value={dietaryRequirements} onChange={(event) => setDietaryRequirements(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="traveler-medical">Medical notes</Label>
              <Textarea id="traveler-medical" maxLength={2000} value={medicalNotes} onChange={(event) => setMedicalNotes(event.target.value)} />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Role and notes</h3>
            <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-fg">Trip leader</p>
                <p className="text-xs text-fg-muted">{leaderTaken ? 'This trip already has a leader' : 'Only one traveler can lead a trip'}</p>
              </div>
              <Switch aria-label="Trip leader" checked={isTripLeader} disabled={leaderTaken} onCheckedChange={setIsTripLeader} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="traveler-notes">Notes</Label>
              <Textarea id="traveler-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </section>

          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : editing ? 'Save changes' : 'Add traveler'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
