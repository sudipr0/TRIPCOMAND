import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { StaffAssignmentDetail, TripDetail } from '@trailcomand/shared';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { useStaffAssignments } from '@/features/trips/hooks/useTrips';
import { useDeleteStaffAssignment } from '@/features/trips/hooks/useTrips';
import { formatCurrency, formatDateRange, getInitials } from '@/lib/utils';
import { staffTypeLabel } from '@/features/staff/components/StaffStatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useChangeStaffAssignmentStatus } from '@/features/trips/hooks/useTrips';
import { DeleteIcon, EditIcon, SpinnerIcon, UsersThreeIcon } from '@/components/icons';
import { AssignmentStatusBadge } from '@/features/trips/components/AssignmentStatusBadge';
import { AssignStaffDialog, roleLabel } from '@/features/trips/components/AssignStaffDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CancelAssignmentDialog, ConfirmAssignmentDialog } from '@/features/trips/components/AssignmentLifecycleDialogs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const roleVariants: Record<string, BadgeVariant> = {
  lead_guide: 'info',
  assistant_guide: 'info',
  head_porter: 'warning',
  porter: 'default',
  cook: 'default',
  driver: 'default',
  other: 'default',
};

const daysBetween = (start: string, end: string) =>
  Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;

export function StaffTab({ trip }: { trip: TripDetail }) {
  const assignments = useStaffAssignments(trip.id);
  const changeStatus = useChangeStaffAssignmentStatus(trip.id);
  const remove = useDeleteStaffAssignment(trip.id);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirming, setConfirming] = useState<StaffAssignmentDetail | null>(null);
  const [cancelling, setCancelling] = useState<StaffAssignmentDetail | null>(null);
  const [deleting, setDeleting] = useState<StaffAssignmentDetail | null>(null);

  const items = assignments.data ?? [];
  const leadGuide = items.find((assignment) => assignment.role === 'lead_guide' && assignment.status !== 'CANCELLED' && assignment.status !== 'DECLINED');

  function actionsFor(assignment: StaffAssignmentDetail) {
    const canConfirm = assignment.status === 'PROPOSED';
    const canDecline = assignment.status === 'PROPOSED';
    const canComplete = assignment.status === 'CONFIRMED' && trip.status === 'IN_PROGRESS';
    const canCancel = assignment.status === 'PROPOSED' || assignment.status === 'CONFIRMED';
    const canDelete = assignment.status === 'CANCELLED' || assignment.status === 'DECLINED';
    return { canConfirm, canDecline, canComplete, canCancel, canDelete };
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <CardTitle>Staff assignments</CardTitle>
          <span className="text-xs text-fg-subtle">{items.length} assigned</span>
        </div>
        <Button type="button" size="sm" onClick={() => setAssignOpen(true)}>Assign staff</Button>
      </CardHeader>
      {assignments.isPending ? (
        <CardContent>
          <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-fg-muted">
            <SpinnerIcon size={18} className="animate-spin" />Loading assignments...
          </p>
        </CardContent>
      ) : assignments.isError ? (
        <CardContent>
          <p role="alert" className="text-sm text-fg-muted">
            Could not load staff assignments. <Button type="button" variant="link" onClick={() => assignments.refetch()}>Try again</Button>
          </p>
        </CardContent>
      ) : !items.length ? (
        <CardContent>
          <EmptyState icon={UsersThreeIcon} title="No staff assigned yet"
            description="Assign guides, porters, and support staff for this trip."
            action={<Button type="button" onClick={() => setAssignOpen(true)}>Assign staff</Button>} />
        </CardContent>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead><TableHead>Role</TableHead><TableHead>Dates</TableHead>
                  <TableHead className="text-right">Rate</TableHead><TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((assignment) => {
                  const actions = actionsFor(assignment);
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <p className="text-sm font-medium text-fg">{assignment.staff?.fullName ?? 'Staff unavailable'}</p>
                        <p className="text-xs text-fg-muted">{assignment.staff ? staffTypeLabel(assignment.staff.staffType) : '—'}</p>
                      </TableCell>
                      <TableCell><Badge variant={roleVariants[assignment.role] ?? 'default'}>{roleLabel(assignment.role)}</Badge></TableCell>
                      <TableCell>
                        <p className="whitespace-nowrap text-xs text-fg-muted">{formatDateRange(assignment.startDate, assignment.endDate)}</p>
                        <p className="text-xs text-fg-subtle">{daysBetween(assignment.startDate, assignment.endDate)} days</p>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-fg">
                        {assignment.agreedRate ? formatCurrency(assignment.agreedRate, assignment.currency) : '—'}
                      </TableCell>
                      <TableCell><AssignmentStatusBadge status={assignment.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${assignment.staff?.fullName ?? 'assignment'}`}>
                              <EditIcon size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions.canConfirm ? <DropdownMenuItem onSelect={() => setConfirming(assignment)}>Confirm</DropdownMenuItem> : null}
                            {actions.canDecline ? <DropdownMenuItem onSelect={() => changeStatus.mutate({ assignmentId: assignment.id, status: 'DECLINED' })}>Decline</DropdownMenuItem> : null}
                            {actions.canComplete ? <DropdownMenuItem onSelect={() => changeStatus.mutate({ assignmentId: assignment.id, status: 'COMPLETED' })}>Mark complete</DropdownMenuItem> : null}
                            {actions.canCancel ? <DropdownMenuItem onSelect={() => setCancelling(assignment)}>Cancel</DropdownMenuItem> : null}
                            {actions.canDelete ? (
                              <><DropdownMenuSeparator />
                                <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setDeleting(assignment)}>
                                  <DeleteIcon size={16} />Delete
                                </DropdownMenuItem></>
                            ) : null}
                            {!actions.canConfirm && !actions.canDecline && !actions.canComplete && !actions.canCancel && !actions.canDelete ? (
                              <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {leadGuide?.staff ? (
            <div className="flex items-center gap-3 border-t border-border px-5 py-3">
              <Avatar className="h-8 w-8"><AvatarFallback>{getInitials(leadGuide.staff.fullName)}</AvatarFallback></Avatar>
              <p className="text-sm text-fg-muted">Lead guide: <span className="font-medium text-fg">{leadGuide.staff.fullName}</span></p>
              <Button variant="link" asChild className="ml-auto h-auto px-0 text-sm">
                <Link to={`/staff/${leadGuide.staffId}`}>View staff &rarr;</Link>
              </Button>
            </div>
          ) : null}
        </>
      )}

      {assignOpen ? <AssignStaffDialog key="assign" trip={trip} open onOpenChange={setAssignOpen} /> : null}
      {confirming ? (
        <ConfirmAssignmentDialog open onOpenChange={(next) => { if (!next) setConfirming(null); }}
          name={confirming.staff?.fullName ?? 'This staff member'} roleLabel={roleLabel(confirming.role)}
          pending={changeStatus.isPending}
          onConfirm={() => changeStatus.mutate({ assignmentId: confirming.id, status: 'CONFIRMED' }, { onSuccess: () => setConfirming(null) })} />
      ) : null}
      {cancelling ? (
        <CancelAssignmentDialog open onOpenChange={(next) => { if (!next) setCancelling(null); }}
          name={cancelling.staff?.fullName ?? 'This staff member'} isLeadGuide={cancelling.role === 'lead_guide'}
          pending={changeStatus.isPending}
          onConfirm={(reason) => changeStatus.mutate({ assignmentId: cancelling.id, status: 'CANCELLED', notes: reason }, { onSuccess: () => setCancelling(null) })} />
      ) : null}
      {deleting ? (
        <ConfirmDialog open onOpenChange={(next) => { if (!next) setDeleting(null); }}
          title="Delete this assignment?"
          description={`Remove ${deleting.staff?.fullName ?? 'this staff member'}'s ${roleLabel(deleting.role)} assignment from the trip. It stays in the audit history.`}
          confirmLabel="Delete assignment" variant="danger"
          onConfirm={async () => { await remove.mutateAsync(deleting.id); setDeleting(null); }} />
      ) : null}
    </Card>
  );
}
