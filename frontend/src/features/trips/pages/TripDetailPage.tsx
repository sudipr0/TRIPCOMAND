import { useEffect, useState } from 'react';
import { type ReadinessSummary, type TripDetail } from '@trailcomand/shared';
import { type TripStatus, type TripTravelerDetail } from '@trailcomand/shared';
import { PERMISSION_CODES, type ItineraryDayDetail } from '@trailcomand/shared';
import type { DayStatusValue } from '@trailcomand/shared';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { DeleteIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useStaffList } from '@/features/staff/hooks/useStaff';
import { useDeleteDay } from '@/features/trips/hooks/useTrips';
import { useUpdateDayStatus } from '@/features/trips/hooks/useTrips';
import { TripTimeline, DAY_STATUS_LABEL } from '@/components/ui/trip-timeline';

const DAY_STATUS_OPTIONS = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'PROBLEM'] as const;
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTripReadiness } from '@/features/trips/hooks/useTrips';
import { useBookings } from '@/features/bookings/hooks/useBookings';
import { useDeleteTraveler } from '@/features/trips/hooks/useTrips';
import { EditIcon, ErrorIcon, MapPinIcon } from '@/components/icons';
import { DayTimeline } from '@/features/trips/components/DayTimeline';
import { useUpdateTripStatus } from '@/features/trips/hooks/useTrips';
import { ArrowRightIcon, BedIcon, CheckIcon } from '@/components/icons';
import { UsersIcon, WalkingIcon, WarningIcon } from '@/components/icons';
import { useDeleteTrip, useTrip } from '@/features/trips/hooks/useTrips';
import { SuccessIcon, TripIcon, UncheckedIcon } from '@/components/icons';
import { TripFormDialog } from '@/features/trips/components/TripFormDialog';
import { MountainsIcon, PaymentIcon, QuotationIcon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAllInquiryCustomers } from '@/features/inquiries/hooks/useInquiries';
import { BookingStatusBadge } from '@/features/bookings/components/BookingBadges';
import { AddTravelerDialog } from '@/features/trips/components/AddTravelerDialog';
import { ItineraryDayDialog } from '@/features/trips/components/ItineraryDayDialog';
import { formatDate, formatDateRange, formatDateTime, getInitials } from '@/lib/utils';
import { TemplatePickerDialog } from '@/features/trips/components/TemplatePickerDialog';
import { AssignOpsManagerDialog } from '@/features/trips/components/AssignOpsManagerDialog';
import { StaffTab } from '@/features/trips/components/StaffTab';
import { ResourcesTab } from '@/features/trips/components/ResourcesTab';
import { SuppliersTab } from '@/features/suppliers/components/SuppliersTab';
import { FieldUpdatesTab } from '@/features/field/components/FieldUpdatesTab';
import { useFieldData } from '@/features/field/useField';
import { BulkAddTravelersDialog } from '@/features/trips/components/BulkAddTravelersDialog';
import { PublishItineraryDialog } from '@/features/trips/components/PublishItineraryDialog';
import { ItineraryVersionsDialog } from '@/features/trips/components/ItineraryVersionsDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TRIP_TRANSITIONS, TripStatusBadge, tripStatusLabel } from '@/features/trips/components/TripStatusBadge';
import { ReadinessBadge, readinessTooltip, type ReadinessStatus } from '@/features/trips/components/ReadinessBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDisruptions } from '@/features/disruptions/useDisruptions';
import { ReportDisruptionDialog } from '@/features/disruptions/components/ReportDisruptionDialog';
import { FinanceTab } from '@/features/finance/components/FinanceTab';
import { PortalLinkButton, TripDocumentsDialog } from '@/features/portal/components/TravelerPortalActions';

type TabValue = 'overview' | 'staff' | 'resources' | 'suppliers' | 'itinerary' | 'travelers' | 'field' | 'disruptions' | 'finance';
const ALL_TABS: TabValue[] = ['overview', 'staff', 'resources', 'suppliers', 'itinerary', 'travelers', 'field', 'disruptions', 'finance'];

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-fg">{value || '—'}</dd>
    </div>
  );
}

function readinessOf(status: string, summary?: ReadinessSummary): ReadinessStatus | 'NOT_APPLICABLE' {
  if (status === 'COMPLETED' || status === 'CANCELLED') return 'NOT_APPLICABLE';
  return (summary?.status as ReadinessStatus) ?? 'NOT_READY';
}

/** Readiness lives outside the trip payload (it is computed on every read), so it is fetched alongside. */
function useCustomerName(customerId: string) {
  const customers = useAllInquiryCustomers();
  return customers.data?.find((customer) => customer.id === customerId)?.fullName ?? 'Customer unavailable';
}

function maskPassport(passport: string | null) {
  if (!passport) return '—';
  if (passport.length <= 4) return '*'.repeat(passport.length);
  return `${passport.slice(0, 2)}${'*'.repeat(Math.max(2, passport.length - 4))}${passport.slice(-2)}`;
}

// ── Field updates ────────────────────────────────────────────────────────────

/** Rendered above the tabs so an emergency is impossible to miss on any tab. */
function EmergencyBanner({ tripId, onOpen }: { tripId: string; onOpen: () => void }) {
  const field = useFieldData(tripId);
  const emergencies = (field.data?.reports ?? []).filter((report) => report.reportType === 'EMERGENCY');
  if (!emergencies.length) return null;
  const latest = emergencies[0];
  return (
    <Card role="alert" className="border-danger bg-[hsl(var(--danger)/0.06)]">
      <CardContent className="flex flex-wrap items-start gap-3 p-4">
        <ErrorIcon size={20} className="mt-0.5 shrink-0 text-danger" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-danger">
            {emergencies.length} emergency {emergencies.length === 1 ? 'report' : 'reports'} from the field
          </p>
          <p className="mt-0.5 truncate text-sm text-fg">{latest.description}</p>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {latest.location ? `${latest.location} · ` : ''}{formatDateTime(latest.recordedAt)}
          </p>
        </div>
        <Button type="button" size="sm" variant="danger" onClick={onOpen}>Review</Button>
      </CardContent>
    </Card>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

function ReadinessCard({ trip, readiness, onJump }: {
  trip: TripDetail;
  readiness: ReadinessSummary | undefined;
  onJump: (tab: TabValue) => void;
}) {
  const published = Boolean(trip.publishedItineraryVersionId);
  const travelerCount = trip.travelers?.length ?? 0;
  const status = readinessOf(trip.status, readiness);
  const blockers = readiness?.blockingIssues ?? [];
  const warnings = readiness?.warnings ?? [];

  const bannerTone = status === 'READY' ? 'border-success text-success'
    : status === 'BLOCKED' ? 'border-danger text-danger'
      : status === 'PARTIAL' ? 'border-warning text-warning' : 'border-border text-fg-muted';
  const bannerText = status === 'READY' ? 'Trip is ready to depart'
    : status === 'BLOCKED' ? 'Trip has blockers'
      : status === 'PARTIAL' ? `Almost ready — ${warnings.length} ${warnings.length === 1 ? 'warning' : 'warnings'}`
        : 'Not yet configured';

  const factors = [
    { key: 'ops', label: 'Operations manager assigned', done: Boolean(trip.operationsManagerId), tab: 'overview' as TabValue },
    { key: 'guide', label: 'Lead guide assigned', done: Boolean(trip.leadGuideId), tab: 'overview' as TabValue },
    { key: 'itinerary', label: 'Itinerary published', done: published, tab: 'itinerary' as TabValue },
    { key: 'travelers', label: 'At least 1 traveler added', done: travelerCount > 0, tab: 'travelers' as TabValue },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Readiness</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm font-medium ${bannerTone}`}>
          {status === 'READY' ? <SuccessIcon size={16} /> : status === 'BLOCKED' ? <ErrorIcon size={16} /> : status === 'PARTIAL' ? <WarningIcon size={16} /> : null}
          <span>{bannerText}</span>
        </div>
        {blockers.length ? <ul className="space-y-1">{blockers.map((issue) => (
          <li key={issue} className="flex items-start gap-2 text-sm text-fg"><ErrorIcon size={14} className="mt-0.5 shrink-0 text-danger" />{issue}</li>
        ))}</ul> : null}
        {warnings.length ? <ul className="space-y-1">{warnings.map((issue) => (
          <li key={issue} className="flex items-start gap-2 text-sm text-fg"><WarningIcon size={14} className="mt-0.5 shrink-0 text-warning" />{issue}</li>
        ))}</ul> : null}
        <ul className="space-y-1">
          {factors.map((factor) => (
            <li key={factor.key}>
              <button type="button" onClick={() => onJump(factor.tab)}
                className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm text-fg transition-colors duration-fast hover:bg-bg-muted">
                {factor.done
                  ? <CheckIcon size={16} className="text-success" aria-hidden="true" />
                  : <UncheckedIcon size={16} className="text-fg-subtle" aria-hidden="true" />}
                <span className={factor.done ? 'text-fg' : 'text-fg-muted'}>{factor.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function NotesCard({ trip }: { trip: TripDetail }) {
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TRIP_UPDATE));
  const [notes, setNotes] = useState(trip.notes ?? '');
  useEffect(() => { setNotes(trip.notes ?? ''); }, [trip.notes]);
  return (
    <Card>
      <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
      <CardContent>
        <Textarea aria-label="Trip notes" value={notes} onChange={(event) => setNotes(event.target.value)}
          disabled={!canUpdate} placeholder="Internal notes for this trip" />
      </CardContent>
    </Card>
  );
}

function OperationsCard({ trip, customerName, onAssign }: {
  trip: TripDetail; customerName: string; onAssign: () => void;
}) {
  const staff = useStaffList({ limit: 100, offset: 0 });
  const opsManager = staff.data?.items.find((member) => member.id === trip.operationsManagerId);
  const leadGuide = staff.data?.items.find((member) => member.id === trip.leadGuideId);
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TRIP_ASSIGN));

  const rows = [
    { label: 'Operations manager', person: opsManager, action: canUpdate ? onAssign : undefined, actionLabel: opsManager ? 'Change' : 'Assign' },
    { label: 'Lead guide', person: leadGuide, action: undefined, actionLabel: 'Phase 5' },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Operations</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{row.label}</p>
              {row.person ? (
                <p className="truncate text-sm text-fg">{row.person.fullName}</p>
              ) : (
                <p className="text-sm text-fg-muted">Unassigned</p>
              )}
            </div>
            {row.action ? <Button type="button" size="sm" variant="secondary" onClick={row.action}>{row.actionLabel}</Button>
              : row.actionLabel === 'Phase 5' ? <span className="text-xs text-fg-subtle">Phase 5</span> : null}
          </div>
        ))}
        <p className="border-t border-border pt-2 text-xs text-fg-subtle">{customerName}</p>
      </CardContent>
    </Card>
  );
}

function OverviewTab({ trip, readiness, customerName, onJump, onAssign, setTab }: {
  trip: TripDetail; readiness?: ReadinessSummary; customerName: string;
  onJump: (tab: TabValue) => void; onAssign: () => void; setTab: (tab: TabValue) => void;
}) {
  const bookings = useBookings({ limit: 1, offset: 0 });
  const linkedBooking = bookings.data?.items.find((booking) => booking.id === trip.bookingId);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <ReadinessCard trip={trip} readiness={readiness} onJump={onJump} />
        <NotesCard trip={trip} />
      </div>
      <aside className="space-y-6">
        <OperationsCard trip={trip} customerName={customerName} onAssign={onAssign} />
        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(customerName)}</AvatarFallback></Avatar>
              <p className="min-w-0 truncate text-sm font-medium text-fg">{customerName}</p>
            </div>
            <Button variant="link" asChild className="mt-3 h-auto px-0 text-sm">
              <Link to={`/customers/${trip.customerId}`} className="inline-flex items-center gap-1">View customer <ArrowRightIcon size={14} /></Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Booking</CardTitle></CardHeader>
          <CardContent>
            {trip.bookingId ? (
              <>
                <p className="text-xs uppercase tracking-wide tabular-nums text-fg-subtle">{linkedBooking?.bookingNumber ?? 'Linked booking'}</p>
                {linkedBooking ? <div className="mt-1"><BookingStatusBadge status={linkedBooking.status} /></div> : null}
                <Button variant="link" asChild className="mt-3 h-auto px-0 text-sm">
                  <Link to={`/bookings/${trip.bookingId}`} className="inline-flex items-center gap-1">View booking <ArrowRightIcon size={14} /></Link>
                </Button>
                <Button variant="link" asChild className="ml-3 mt-3 h-auto px-0 text-sm">
                  <Link to={`/bookings/${trip.bookingId}`} className="inline-flex items-center gap-1"><PaymentIcon size={14} />Payments</Link>
                </Button>
              </>
            ) : <p className="text-sm text-fg-muted">Standalone trip — no booking linked.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <DetailRow label="Created" value={formatDateTime(trip.createdAt)} />
              <DetailRow label="Starts" value={formatDate(trip.startDate)} />
              <DetailRow label="Ends" value={formatDate(trip.endDate)} />
              {trip.status === 'COMPLETED' ? <DetailRow label="Completed" value={formatDateTime(trip.updatedAt)} /> : null}
            </dl>
            <Button type="button" variant="link" className="mt-3 h-auto px-0 text-sm" onClick={() => setTab('travelers')}>
              {trip.travelers?.length ?? 0} travelers
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

// ── Itinerary ────────────────────────────────────────────────────────────────

function DayMeta({ day }: { day: ItineraryDayDetail }) {
  const parts: { icon: React.ReactNode; text: string }[] = [];
  if (day.location) parts.push({ icon: <MapPinIcon size={14} />, text: day.location });
  if (day.altitude !== null) parts.push({ icon: <MountainsIcon size={14} />, text: `${day.altitude} m` });
  if (day.walkingHours) parts.push({ icon: <WalkingIcon size={14} />, text: `${day.walkingHours} h` });
  if (day.accommodation) parts.push({ icon: <BedIcon size={14} />, text: day.accommodation });
  if (!parts.length) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
      {parts.map((part, index) => (
        <span key={`${part.text}-${index}`} className="inline-flex items-center gap-1">{part.icon}{part.text}</span>
      ))}
    </div>
  );
}

function ItineraryTab({ trip, locked }: { trip: TripDetail; locked: boolean }) {
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TRIP_UPDATE));
  const canPublish = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TRIP_PUBLISH_ITINERARY));
  const deleteDay = useDeleteDay(trip.id);
  const updateStatus = useUpdateDayStatus(trip.id);
  const days = trip.itineraryDays ?? [];
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<ItineraryDayDetail | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ItineraryDayDetail | null>(null);

  const editable = canUpdate && !locked;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <CardTitle>Itinerary</CardTitle>
          <span className="text-xs text-fg-subtle">{days.length} {days.length === 1 ? 'day' : 'days'}</span>
          {locked ? <Badge variant="success">Published</Badge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {days.length ? (
            <div className="inline-flex rounded-md border-border p-0.5" role="group" aria-label="Itinerary view">
              <Button
                type="button"
                size="sm"
                variant={view === 'list' ? 'secondary' : 'ghost'}
                className="h-7"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              >
                List View
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === 'timeline' ? 'secondary' : 'ghost'}
                className="h-7"
                aria-pressed={view === 'timeline'}
                onClick={() => setView('timeline')}
              >
                Timeline View
              </Button>
            </div>
          ) : null}
          {!locked && !days.length && editable ? (
            <>
              <Button type="button" size="sm" onClick={() => setTemplateOpen(true)}>Use template</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setAddOpen(true)}>Add day</Button>
            </>
          ) : null}
          {!locked && days.length && editable ? (
            <>
              <Button type="button" size="sm" variant="secondary" onClick={() => setAddOpen(true)}>Add day</Button>
              {canPublish ? <Button type="button" size="sm" onClick={() => setPublishOpen(true)}>Publish itinerary</Button> : null}
            </>
          ) : null}
          {locked ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => setVersionsOpen(true)}>View version history</Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {locked ? <p className="mb-4 text-xs text-fg-muted">Published itinerary is locked for editing in this phase.</p> : null}
        {!days.length ? (
          <EmptyState
            icon={TripIcon}
            title="No itinerary yet"
            description="Start with a template or add days manually."
            action={editable ? (
              <div className="flex gap-2">
                <Button type="button" onClick={() => setTemplateOpen(true)}>Use template</Button>
                <Button type="button" variant="secondary" onClick={() => setAddOpen(true)}>Add day</Button>
              </div>
            ) : undefined}
          />
        ) : view === 'timeline' ? (
          <TripTimeline
            days={days}
            renderDayAction={(day) => (
              <Select
                aria-label={`Status for day ${day.dayNumber}`}
                value={day.status}
                disabled={!canUpdate || updateStatus.isPending}
                className="h-8 w-36 text-xs"
                onChange={(event) =>
                  updateStatus.mutate({ dayId: day.id, status: event.target.value as DayStatusValue })
                }
              >
                {DAY_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{DAY_STATUS_LABEL[option]}</option>
                ))}
              </Select>
            )}
          />
        ) : (
          <DayTimeline
            items={days.map((day) => ({
              id: day.id,
              dayNumber: day.dayNumber,
              content: (
                <div className="rounded-lg border border-border bg-bg px-4 py-3 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wide text-fg-subtle">Day {day.dayNumber}</p>
                      <p className="mt-0.5 text-base font-medium text-fg">{day.title}</p>
                    </div>
                    {editable ? (
                      <div className="flex shrink-0 gap-1">
                        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 px-0" aria-label={`Edit day ${day.dayNumber}`}
                          onClick={() => setEditingDay(day)}><EditIcon size={16} /></Button>
                        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 px-0 text-fg-subtle hover:text-danger"
                          aria-label={`Delete day ${day.dayNumber}`} onClick={() => setDeleteTarget(day)}><DeleteIcon size={16} /></Button>
                      </div>
                    ) : null}
                  </div>
                  <DayMeta day={day} />
                  {day.description ? <p className="mt-2 line-clamp-2 text-sm text-fg-muted">{day.description}</p> : null}
                  {day.meals.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {day.meals.map((meal) => <Badge key={meal}>{meal}</Badge>)}
                    </div>
                  ) : null}
                </div>
              ),
            }))}
          />
        )}
      </CardContent>

      {templateOpen ? <TemplatePickerDialog tripId={trip.id} existingDays={days.length} open onOpenChange={setTemplateOpen} /> : null}
      {publishOpen ? <PublishItineraryDialog tripId={trip.id} dayCount={days.length} nextVersion={1} open onOpenChange={setPublishOpen} /> : null}
      {versionsOpen ? <ItineraryVersionsDialog tripId={trip.id} open onOpenChange={setVersionsOpen} /> : null}
      {addOpen ? <ItineraryDayDialog key="add-day" tripId={trip.id} defaultDayNumber={days.length + 1} open onOpenChange={setAddOpen} /> : null}
      {editingDay ? <ItineraryDayDialog key={editingDay.id} tripId={trip.id} day={editingDay} open onOpenChange={(next) => { if (!next) setEditingDay(null); }} /> : null}
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(next) => { if (!next) setDeleteTarget(null); }}
        title="Delete this day?" description={deleteTarget ? `Remove day ${deleteTarget.dayNumber} ("${deleteTarget.title}") from the itinerary.` : ''}
        confirmLabel="Delete day" variant="danger"
        onConfirm={async () => { if (deleteTarget) await deleteDay.mutateAsync(deleteTarget.id); setDeleteTarget(null); }} />
    </Card>
  );
}

// ── Travelers ────────────────────────────────────────────────────────────────

function TravelerBadges({ traveler }: { traveler: TripTravelerDetail }) {
  const indicators: { icon: React.ReactNode; title: string }[] = [];
  if (traveler.medicalNotes) indicators.push({ icon: <ErrorIcon size={14} className="text-danger" />, title: 'Medical notes' });
  if (traveler.dietaryRequirements) indicators.push({ icon: <WarningIcon size={14} className="text-warning" />, title: 'Dietary requirements' });
  if (traveler.insuranceProvider) indicators.push({ icon: <SuccessIcon size={14} className="text-success" />, title: 'Insurance on file' });
  if (!indicators.length) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 align-middle">
      {indicators.map((indicator) => <span key={indicator.title} title={indicator.title}>{indicator.icon}</span>)}
    </span>
  );
}

function TravelersTab({ trip }: { trip: TripDetail }) {
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TRIP_UPDATE));
  const travelers = trip.travelers ?? [];
  const deleteTraveler = useDeleteTraveler(trip.id);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<TripTravelerDetail | null>(null);
  const [deleting, setDeleting] = useState<TripTravelerDetail | null>(null);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const hasLeader = travelers.some((traveler) => traveler.isTripLeader);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Travelers</CardTitle>
          <span className="text-xs text-fg-subtle">{travelers.length} {travelers.length === 1 ? 'traveler' : 'travelers'}</span>
          {hasLeader ? <span className="text-xs text-fg-muted">Leader: {travelers.find((traveler) => traveler.isTripLeader)?.fullName}</span> : null}
        </div>
        {canUpdate ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setDocumentsOpen(true)}>Documents</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setBulkOpen(true)}>Bulk add</Button>
            <Button type="button" size="sm" onClick={() => setAddOpen(true)}>Add traveler</Button>
          </div>
        ) : null}
      </CardHeader>
      {travelers.length ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Passport</TableHead>
                <TableHead>Nationality</TableHead><TableHead>Role</TableHead>
                {canUpdate ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {travelers.map((traveler) => (
                <TableRow key={traveler.id}>
                  <TableCell>
                    <span className="text-sm font-medium text-fg">{traveler.fullName}</span>
                    {traveler.isTripLeader ? <Badge className="ml-2">Leader</Badge> : null}
                    <TravelerBadges traveler={traveler} />
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-fg-muted">{traveler.email ?? 'No email'}</p>
                    <p className="text-xs text-fg-muted">{traveler.phone ?? 'No phone'}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums text-fg-muted" title={traveler.passportNumber ?? undefined}>
                    {maskPassport(traveler.passportNumber)}
                  </TableCell>
                  <TableCell className="text-sm text-fg-muted">{traveler.nationality ?? '—'}</TableCell>
                  <TableCell className="text-sm text-fg-muted">{traveler.isTripLeader ? 'Leader' : 'Member'}</TableCell>
                  {canUpdate ? (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <PortalLinkButton tripId={trip.id} travelerId={traveler.id} travelerName={traveler.fullName} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${traveler.fullName}`}>
                              <EditIcon size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditing(traveler)}><EditIcon size={16} />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setDeleting(traveler)}>
                              <DeleteIcon size={16} />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <CardContent>
          <EmptyState icon={UsersIcon} title="No travelers yet"
            description="Add travelers to make this trip ready for departure."
            action={canUpdate ? (
              <div className="flex gap-2">
                <Button type="button" onClick={() => setAddOpen(true)}>Add traveler</Button>
                <Button type="button" variant="secondary" onClick={() => setBulkOpen(true)}>Bulk add</Button>
              </div>
            ) : undefined} />
        </CardContent>
      )}

      {addOpen ? <AddTravelerDialog key="add" tripId={trip.id} hasExistingLeader={hasLeader} open onOpenChange={setAddOpen} /> : null}      {editing ? <AddTravelerDialog key={editing.id} tripId={trip.id} traveler={editing} hasExistingLeader={hasLeader} open onOpenChange={(next) => { if (!next) setEditing(null); }} /> : null}
      {bulkOpen ? <BulkAddTravelersDialog tripId={trip.id} open onOpenChange={setBulkOpen} /> : null}
      <TripDocumentsDialog tripId={trip.id} open={documentsOpen} onOpenChange={setDocumentsOpen} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(next) => { if (!next) setDeleting(null); }}
        title="Remove this traveler?" description={deleting ? `Remove ${deleting.fullName} from this trip? This does not delete the customer record.` : ''}
        confirmLabel="Remove traveler" variant="danger"
        onConfirm={async () => { if (deleting) await deleteTraveler.mutateAsync(deleting.id); setDeleting(null); }} />
    </Card>
  );
}

function DisruptionsTab({ trip }: { trip: TripDetail }) {
  const disruptions = useDisruptions(trip.id);
  const [reportOpen, setReportOpen] = useState(false);
  return <Card><CardHeader className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle>Disruptions</CardTitle><p className="mt-1 text-sm text-fg-muted">Deterministic impact assessments and recovery plans for this trip.</p></div><Button type="button" size="sm" onClick={() => setReportOpen(true)}>Report disruption</Button></CardHeader><CardContent>{disruptions.isPending ? <p role="status" className="py-8 text-center text-sm text-fg-muted">Loading disruptions...</p> : disruptions.isError ? <p role="alert" className="text-sm text-fg-muted">Could not load disruptions. <Button type="button" variant="link" onClick={() => disruptions.refetch()}>Try again</Button></p> : !disruptions.data.length ? <EmptyState icon={WarningIcon} title="No disruptions for this trip" description="Report an operational issue to generate its impact graph." action={<Button type="button" onClick={() => setReportOpen(true)}>Report disruption</Button>} /> : <div className="space-y-3">{disruptions.data.map((disruption) => <Link key={disruption.id} to={`/disruptions/${disruption.id}`} className="block rounded-md border border-border px-4 py-3 transition-colors hover:bg-bg-muted"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs tabular-nums text-fg-subtle">{disruption.disruptionNumber}</p><p className="mt-1 text-sm font-medium text-fg">{disruption.title}</p><p className="mt-1 text-xs text-fg-muted">{disruption.impacts.length} impacted entities · {disruption.recoveryPlan?.status ?? 'No plan'}</p></div><Badge variant={disruption.status === 'RESOLVED' ? 'success' : disruption.status === 'EXECUTING' ? 'warning' : 'danger'}>{disruption.status.replaceAll('_', ' ')}</Badge></div></Link>)}</div>}</CardContent><ReportDisruptionDialog open={reportOpen} onOpenChange={setReportOpen} tripId={trip.id} /></Card>;
}

// ── Page ─────────────────────────────────────────────────────────────────────

function Content({ trip }: { trip: TripDetail }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const readinessQuery = useTripReadiness(trip.id);
  const customerName = useCustomerName(trip.customerId);
  const remove = useDeleteTrip();
  const statusMutation = useUpdateTripStatus(trip.id);
  const canUpdate = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TRIP_UPDATE));
  const canDelete = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.TRIP_DELETE));
  // Finance is need-to-know: only roles holding finance:read see the tab at all.
  const canReadFinance = useWorkspaceStore((state) => state.permissions.includes(PERMISSION_CODES.FINANCE_READ));
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const requested = searchParams.get('tab');
    if (requested && (ALL_TABS as string[]).includes(requested)) {
      if (requested === 'finance' && !canReadFinance) return;
      setActiveTab(requested as TabValue);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, canReadFinance]);

  const readiness = readinessQuery.data;
  const status = readinessOf(trip.status, readiness);
  const transitions = canUpdate ? TRIP_TRANSITIONS[trip.status as TripStatus] ?? [] : [];
  const locked = Boolean(trip.publishedItineraryVersionId);

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide tabular-nums text-fg-subtle">{trip.tripNumber}</p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-fg">{trip.name}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {customerName} · {formatDateRange(trip.startDate, trip.endDate)} · {trip.travelers?.length ?? 0} {trip.travelers?.length === 1 ? 'traveler' : 'travelers'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ReadinessBadge status={status} title={readiness ? readinessTooltip(readiness.blockingIssues, readiness.warnings) : undefined} />
            <TripStatusBadge status={trip.status as TripStatus} />
            {locked ? <Badge>Itinerary published</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate ? <Button type="button" size="sm" variant="secondary" onClick={() => setEditOpen(true)}><EditIcon size={16} />Edit</Button> : null}
          {transitions.length ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => setStatusOpen(true)}>Change status</Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="ghost" aria-label="More trip actions"><QuotationIcon size={18} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {trip.bookingId ? <DropdownMenuItem asChild><Link to={`/bookings/${trip.bookingId}`}>View booking</Link></DropdownMenuItem> : null}
              <DropdownMenuItem asChild><Link to={`/customers/${trip.customerId}`}>View customer</Link></DropdownMenuItem>
              {canDelete ? <><DropdownMenuSeparator />
                <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setDeleteOpen(true)}>Delete trip</DropdownMenuItem></> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <EmergencyBanner tripId={trip.id} onOpen={() => setActiveTab('field')} />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="travelers">Travelers</TabsTrigger>
           <TabsTrigger value="field">Field Updates</TabsTrigger>
           <TabsTrigger value="disruptions">Disruptions</TabsTrigger>
           {canReadFinance ? <TabsTrigger value="finance">Finance</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab trip={trip} readiness={readiness} customerName={customerName}
            onJump={(tab) => setActiveTab(tab)} onAssign={() => setAssignOpen(true)} setTab={setActiveTab} />
        </TabsContent>
        <TabsContent value="staff"><StaffTab trip={trip} /></TabsContent>
        <TabsContent value="resources"><ResourcesTab trip={trip} /></TabsContent>
        <TabsContent value="suppliers"><SuppliersTab trip={trip} /></TabsContent>
        <TabsContent value="itinerary"><ItineraryTab trip={trip} locked={locked} /></TabsContent>
        <TabsContent value="travelers"><TravelersTab trip={trip} /></TabsContent>
         <TabsContent value="field"><FieldUpdatesTab tripId={trip.id} /></TabsContent>
         <TabsContent value="disruptions"><DisruptionsTab trip={trip} /></TabsContent>
         {canReadFinance ? <TabsContent value="finance"><FinanceTab trip={trip} /></TabsContent> : null}
      </Tabs>

      {editOpen ? <TripFormDialog trip={trip} open onOpenChange={setEditOpen} /> : null}
      {assignOpen ? <AssignOpsManagerDialog tripId={trip.id} currentOperationsManagerId={trip.operationsManagerId} open onOpenChange={setAssignOpen} /> : null}

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen}
        title="Delete this trip?" description={`Delete ${trip.tripNumber}? The linked booking and customer are kept.`}
        confirmLabel="Delete trip" variant="danger"
        onConfirm={async () => { await remove.mutateAsync(trip.id); navigate('/trips'); }} />

      {statusOpen ? (
        <StatusDialog open onOpenChange={setStatusOpen} transitions={transitions}
          onPick={(next) => statusMutation.mutate({ status: next }, { onSuccess: () => setStatusOpen(false) })}
          current={trip.status as TripStatus} />
      ) : null}
    </>
  );
}

function StatusDialog({ open, onOpenChange, transitions, onPick, current }: {
  open: boolean; onOpenChange: (open: boolean) => void; transitions: TripStatus[];
  onPick: (status: TripStatus) => void; current: TripStatus;
}) {
  const [next, setNext] = useState<TripStatus | ''>('');
  return (
    <ConfirmDialog open={open} onOpenChange={onOpenChange}
      title="Change trip status" description={`Move this trip from ${tripStatusLabel(current)} to a new status.`}
      confirmLabel={next ? `Mark ${tripStatusLabel(next).toLowerCase()}` : 'Change status'}
      onConfirm={async () => { if (next) onPick(next); }}>
      <Select aria-label="New trip status" value={next} onChange={(event) => setNext(event.target.value as TripStatus | '')}>
        <option value="">Select a status</option>
        {transitions.map((status) => <option key={status} value={status}>{tripStatusLabel(status)}</option>)}
      </Select>
    </ConfirmDialog>
  );
}

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const trip = useTrip(tripId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="link" asChild><Link to="/trips">Back to trips</Link></Button>
      {!workspaceId ? <p className="text-sm text-fg-muted">Select a workspace to view this trip.</p>
        : trip.isPending ? <div role="status" className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Skeleton className="h-72 w-full" /><Skeleton className="h-72 w-full" />
          </div>
        </div>
          : trip.isError ? <Card role="alert" className="p-6 text-sm text-fg-muted">
            Could not load this trip. <Button type="button" variant="link" onClick={() => trip.refetch()}>Try again</Button>
          </Card>
            : <Content key={`${workspaceId}:${trip.data.id}`} trip={trip.data} />}
    </div>
  );
}
