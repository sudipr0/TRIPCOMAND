import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ArrowRightIcon, SpinnerIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField } from '@/features/auth/components/FormField';
import { useResources } from '@/features/resources/hooks/useResources';
import { useStaffList } from '@/features/staff/hooks/useStaff';
import { staffTypeLabel } from '@/features/staff/components/StaffStatusBadge';
import { AvailabilityBanner, ConflictBanner } from '@/features/trips/components/ConflictBanner';
import { useResourceAvailability, useStaffAvailability } from '@/features/trips/hooks/useTrips';
import { formatDateRange } from '@/lib/utils';

type Mode = 'staff' | 'resource';

export function AvailabilityPage() {
  const [mode, setMode] = useState<Mode>('staff');
  const [staffId, setStaffId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [checked, setChecked] = useState<{ staffId: string; resourceId: string; startDate: string; endDate: string } | null>(null);

  const staff = useStaffList({ limit: 100, offset: 0 });
  const resources = useResources({ limit: 100, offset: 0 });

  const dateValid = Boolean(startDate && endDate && endDate >= startDate);
  const active = checked && (mode === 'staff' ? checked.staffId : checked.resourceId) && dateValid;

  // Availability queries stay disabled until the user explicitly presses Check.
  const staffAvailability = useStaffAvailability(
    active ? checked.staffId : undefined,
    active ? checked.startDate : undefined,
    active ? checked.endDate : undefined,
  );
  const resourceAvailability = useResourceAvailability(
    active && mode === 'resource' ? checked.resourceId : undefined,
    active ? checked.startDate : undefined,
    active ? checked.endDate : undefined,
  );

  const query = mode === 'staff' ? staffAvailability : resourceAvailability;
  const selectedStaff = staff.data?.items.find((member) => member.id === checked?.staffId);
  const selectedResource = resources.data?.items.find((resource) => resource.id === checked?.resourceId);
  const subject = mode === 'staff'
    ? (selectedStaff ? `${selectedStaff.fullName}` : 'Staff member')
    : (selectedResource ? selectedResource.name : 'Resource');
  const conflicts = query.data && !query.data.available ? query.data.conflictingAssignments : [];

  function check() {
    if (!dateValid) return;
    setChecked({ staffId, resourceId, startDate, endDate });
  }

  function switchMode(next: string) {
    setMode(next as Mode);
    setChecked(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Availability</h1>
        <p className="mt-1 text-sm text-fg-muted">Check who or what is free on given dates</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Check availability</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <Tabs value={mode} onValueChange={switchMode}>
            <TabsList>
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="resource">Resource</TabsTrigger>
            </TabsList>
            <TabsContent value="staff">
              <FormField htmlFor="availability-staff" label="Staff member">
                <Select id="availability-staff" value={staffId} onChange={(event) => { setStaffId(event.target.value); setChecked(null); }}>
                  <option value="">Select staff</option>
                  {(staff.data?.items ?? []).map((member) => (
                    <option key={member.id} value={member.id}>{member.fullName} · {staffTypeLabel(member.staffType)}</option>
                  ))}
                </Select>
              </FormField>
            </TabsContent>
            <TabsContent value="resource">
              <FormField htmlFor="availability-resource" label="Resource">
                <Select id="availability-resource" value={resourceId} onChange={(event) => { setResourceId(event.target.value); setChecked(null); }}>
                  <option value="">Select resource</option>
                  {(resources.data?.items ?? []).map((resource) => (
                    <option key={resource.id} value={resource.id}>{resource.name}{resource.code ? ` · ${resource.code}` : ''}</option>
                  ))}
                </Select>
              </FormField>
            </TabsContent>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="availability-start" label="Start date" required>
              <Input id="availability-start" type="date" value={startDate}
                onChange={(event) => { setStartDate(event.target.value); setChecked(null); }} />
            </FormField>
            <FormField htmlFor="availability-end" label="End date" required>
              <Input id="availability-end" type="date" min={startDate || undefined} value={endDate}
                onChange={(event) => { setEndDate(event.target.value); setChecked(null); }} />
            </FormField>
          </div>
          {startDate && endDate && endDate < startDate ? (
            <p role="alert" className="text-sm text-danger">End date must be on or after the start date.</p>
          ) : null}

          <Button type="button" onClick={check} disabled={!dateValid || (mode === 'staff' ? !staffId : !resourceId)}>Check availability</Button>
        </CardContent>
      </Card>

      {active ? (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Result</CardTitle>
            {query.data ? <Badge variant={query.data.available ? 'success' : 'danger'}>{query.data.available ? 'Available' : 'Not available'}</Badge> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {checked ? <p className="text-xs text-fg-subtle">{formatDateRange(checked.startDate, checked.endDate)}</p> : null}
            {query.isPending ? (
              <p role="status" className="flex items-center gap-2 text-sm text-fg-muted"><SpinnerIcon size={16} className="animate-spin" />Checking...</p>
            ) : query.isError ? (
              <p role="alert" className="text-sm text-danger">Could not check availability. Try again.</p>
            ) : query.data?.available ? (
              <AvailabilityBanner available subject={subject} detail="No conflicting assignments between these dates." />
            ) : (
              <>
                <AvailabilityBanner available={false} subject={subject} detail={`${conflicts.length} conflicting ${conflicts.length === 1 ? 'assignment' : 'assignments'} found.`} />
                <ConflictBanner title="Conflicting assignments" conflicts={conflicts} />
                <ul className="space-y-2">
                  {conflicts.map((conflict) => (
                    <li key={conflict.id ?? conflict.tripId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">{conflict.tripName}</p>
                        <p className="text-xs tabular-nums text-fg-muted">{formatDateRange(conflict.startDate, conflict.endDate)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge>{conflict.status.charAt(0) + conflict.status.slice(1).toLowerCase()}</Badge>
                        {conflict.tripId ? (
                          <Button variant="link" asChild className="h-auto px-0 text-sm">
                            <Link to={`/trips/${conflict.tripId}`} className="inline-flex items-center gap-1">View trip <ArrowRightIcon size={14} /></Link>
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-fg-subtle">Results will appear here.</p>
      )}
    </div>
  );
}
