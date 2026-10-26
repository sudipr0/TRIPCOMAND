import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import type { TripDetail } from '@trailcomand/shared';

import { toDateInput, fromDateInput } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { extractError } from '@/lib/api-client';
import { SpinnerIcon } from '@/components/icons';
import { Textarea } from '@/components/ui/textarea';
import { useStaffList } from '@/features/staff/hooks/useStaff';
import { FormField } from '@/features/auth/components/FormField';
import { staffTypeLabel } from '@/features/staff/components/StaffStatusBadge';
import { useCreateStaffAssignment, useStaffAvailability } from '@/features/trips/hooks/useTrips';
import { AvailabilityBanner, ConflictBanner, type ConflictItem } from '@/features/trips/components/ConflictBanner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type StaffRole = 'lead_guide' | 'assistant_guide' | 'head_porter' | 'porter' | 'cook' | 'driver' | 'other';

export const STAFF_ROLES: { value: StaffRole; label: string }[] = [
  { value: 'lead_guide', label: 'Lead guide' },
  { value: 'assistant_guide', label: 'Assistant guide' },
  { value: 'head_porter', label: 'Head porter' },
  { value: 'porter', label: 'Porter' },
  { value: 'cook', label: 'Cook' },
  { value: 'driver', label: 'Driver' },
  { value: 'other', label: 'Other' },
];

export function roleLabel(role: string) {
  return STAFF_ROLES.find((option) => option.value === role)?.label ?? role.replace('_', ' ');
}

const daysBetween = (start: string, end: string) => {
  if (!start || !end) return 0;
  const diff = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime();
  return Math.floor(diff / 86_400_000) + 1;
};

export function AssignStaffDialog({ trip, open, onOpenChange }: {
  trip: TripDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const staff = useStaffList({ limit: 100, offset: 0 });
  const create = useCreateStaffAssignment(trip.id);
  const tripStart = toDateInput(trip.startDate);
  const tripEnd = toDateInput(trip.endDate);

  const [staffId, setStaffId] = useState('');
  const [role, setRole] = useState<StaffRole>('lead_guide');
  const [startDate, setStartDate] = useState(tripStart);
  const [endDate, setEndDate] = useState(tripEnd);
  const [agreedRate, setAgreedRate] = useState('');
  const [currency, setCurrency] = useState('NPR');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [serverConflicts, setServerConflicts] = useState<ConflictItem[]>([]);

  const dateValid = Boolean(startDate && endDate && endDate >= startDate);
  const availability = useStaffAvailability(staffId || undefined, dateValid ? fromDateInput(startDate) : undefined, dateValid ? fromDateInput(endDate) : undefined);

  const conflicts: ConflictItem[] = serverConflicts.length
    ? serverConflicts
    : availability.data && !availability.data.available ? availability.data.conflictingAssignments : [];
  const blocked = conflicts.length > 0;

  useEffect(() => { setServerConflicts([]); }, [staffId, startDate, endDate]);

  const candidates = (staff.data?.items ?? []).filter((member) => member.status !== 'INACTIVE');
  const selected = candidates.find((member) => member.id === staffId);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!staffId) { setError('Select a staff member'); return; }
    if (!startDate || !endDate) { setError('Both dates are required'); return; }
    if (endDate < startDate) { setError('End date must be on or after the start date'); return; }
    if (startDate < tripStart || endDate > tripEnd) { setError('Assignment dates must fall within the trip dates'); return; }
    if (blocked) { toast.error('Resolve the conflict before assigning'); return; }
    setError('');
    create.mutate({
      tripId: trip.id,
      staffId,
      role,
      startDate: fromDateInput(startDate),
      endDate: fromDateInput(endDate),
      ...(agreedRate.trim() ? { agreedRate: Number(agreedRate) } : {}),
      currency,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    }, {
      onSuccess: () => onOpenChange(false),
      onError: (mutationError) => {
        const details = extractError(mutationError)?.details as { code?: string; conflicts?: ConflictItem[] } | undefined;
        if (details?.code === 'STAFF_CONFLICT' && details.conflicts?.length) setServerConflicts(details.conflicts);
        else setError(extractError(mutationError)?.message ?? 'Could not assign staff');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!create.isPending) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign staff</DialogTitle>
          <DialogDescription>Assign a guide or support staff member to {trip.tripNumber}.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="space-y-5">
          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Staff</h3>
            {staff.isPending ? (
              <p role="status" className="flex items-center gap-2 text-sm text-fg-muted"><SpinnerIcon size={16} className="animate-spin" />Loading staff...</p>
            ) : !candidates.length ? (
              <p className="text-sm text-fg-muted">No active staff yet. Add staff members first.</p>
            ) : (
              <FormField htmlFor="assign-staff-member" label="Staff member" required>
                <Select id="assign-staff-member" value={staffId} onChange={(event) => setStaffId(event.target.value)}>
                  <option value="">Select staff</option>
                  {candidates.map((member) => (
                    <option key={member.id} value={member.id}>{member.fullName} · {staffTypeLabel(member.staffType)}</option>
                  ))}
                </Select>
              </FormField>
            )}
            {selected?.phone ? <p className="text-xs text-fg-subtle">{selected.phone}</p> : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Role and dates</h3>
            <FormField htmlFor="assign-staff-role" label="Role" required>
              <Select id="assign-staff-role" value={role} onChange={(event) => setRole(event.target.value as StaffRole)}>
                {STAFF_ROLES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </FormField>
            {role === 'lead_guide' ? (
              <p className="rounded-md bg-bg-subtle px-3 py-2 text-xs text-fg-muted">This will set the staff member as the trip&rsquo;s lead guide.</p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="assign-staff-start" label="Start date" required>
                <Input id="assign-staff-start" type="date" min={tripStart} max={tripEnd} value={startDate}
                  onChange={(event) => setStartDate(event.target.value)} />
              </FormField>
              <FormField htmlFor="assign-staff-end" label="End date" required>
                <Input id="assign-staff-end" type="date" min={tripStart} max={tripEnd} value={endDate}
                  onChange={(event) => setEndDate(event.target.value)} />
              </FormField>
            </div>
            {dateValid ? <p className="text-xs text-fg-subtle">{daysBetween(startDate, endDate)} days within the trip</p> : null}

            {staffId && dateValid ? (
              availability.isFetching ? (
                <p role="status" className="flex items-center gap-2 text-xs text-fg-muted"><SpinnerIcon size={14} className="animate-spin" />Checking availability...</p>
              ) : availability.isError ? (
                <p role="alert" className="text-xs text-danger">Could not check availability.</p>
              ) : blocked ? (
                <ConflictBanner subject={selected ? `${selected.fullName} already has an assignment on these dates.` : undefined} conflicts={conflicts} />
              ) : availability.data?.available ? (
                <AvailabilityBanner available subject={selected?.fullName ?? 'Staff'} detail="No conflicting assignments between these dates." />
              ) : null
            ) : null}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Rate and notes</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField htmlFor="assign-staff-rate" label="Agreed rate">
                <Input id="assign-staff-rate" type="number" min={0} step="any" className="tabular-nums"
                  value={agreedRate} onChange={(event) => setAgreedRate(event.target.value)} />
              </FormField>
              <FormField htmlFor="assign-staff-currency" label="Currency">
                <Select id="assign-staff-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="NPR">NPR</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </Select>
              </FormField>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-staff-notes">Notes</Label>
              <Textarea id="assign-staff-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </section>

          {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="secondary" disabled={create.isPending} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !staffId || !dateValid || blocked}>
              {create.isPending ? 'Assigning...' : 'Assign staff'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
