import { useState } from 'react';
import type { ResourceAssignmentDetail, TripDetail } from '@tripchange/shared';

import { formatDateRange } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { useResourceAssignments } from '@/features/trips/hooks/useTrips';
import { useDeleteResourceAssignment } from '@/features/trips/hooks/useTrips';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteIcon, EditIcon, SpinnerIcon, TruckIcon } from '@/components/icons';
import { useChangeResourceAssignmentStatus } from '@/features/trips/hooks/useTrips';
import { AssignResourceDialog } from '@/features/trips/components/AssignResourceDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CancelAssignmentDialog, ConfirmAssignmentDialog } from '@/features/trips/components/AssignmentLifecycleDialogs';
import { AssignmentStatusBadge, RESOURCE_ASSIGNMENT_TRANSITIONS } from '@/features/trips/components/AssignmentStatusBadge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const typeVariants: Record<string, BadgeVariant> = { VEHICLE: 'info', EQUIPMENT: 'default', OTHER: 'default' };
const daysBetween = (start: string, end: string) =>
  Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1;
const statusLabel = (status: string) => status.charAt(0) + status.slice(1).toLowerCase();

export function ResourcesTab({ trip }: { trip: TripDetail }) {
  const assignments = useResourceAssignments(trip.id);
  const changeStatus = useChangeResourceAssignmentStatus(trip.id);
  const remove = useDeleteResourceAssignment(trip.id);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirming, setConfirming] = useState<ResourceAssignmentDetail | null>(null);
  const [cancelling, setCancelling] = useState<ResourceAssignmentDetail | null>(null);
  const [deleting, setDeleting] = useState<ResourceAssignmentDetail | null>(null);

  const items = assignments.data ?? [];
  const allowed = (status: string) => RESOURCE_ASSIGNMENT_TRANSITIONS[status] ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <CardTitle>Resource assignments</CardTitle>
          <span className="text-xs text-fg-subtle">{items.length} assigned</span>
        </div>
        <Button type="button" size="sm" onClick={() => setAssignOpen(true)}>Assign resource</Button>
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
            Could not load resource assignments. <Button type="button" variant="link" onClick={() => assignments.refetch()}>Try again</Button>
          </p>
        </CardContent>
      ) : !items.length ? (
        <CardContent>
          <EmptyState icon={TruckIcon} title="No resources assigned yet"
            description="Assign vehicles or equipment to this trip."
            action={<Button type="button" onClick={() => setAssignOpen(true)}>Assign resource</Button>} />
        </CardContent>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((assignment) => {
                const next = allowed(assignment.status);
                return (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-fg">{assignment.resource?.name ?? 'Resource unavailable'}</p>
                      <p className="text-xs text-fg-muted">
                        {assignment.resource?.code ?? assignment.resource?.licensePlate ?? '—'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeVariants[assignment.resource?.type ?? 'OTHER'] ?? 'default'}>
                        {statusLabel(assignment.resource?.type ?? 'OTHER')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="whitespace-nowrap text-xs text-fg-muted">{formatDateRange(assignment.startDate, assignment.endDate)}</p>
                      <p className="text-xs text-fg-subtle">{daysBetween(assignment.startDate, assignment.endDate)} days</p>
                    </TableCell>
                    <TableCell><AssignmentStatusBadge status={assignment.status} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" size="sm" variant="ghost" aria-label={`Actions for ${assignment.resource?.name ?? 'assignment'}`}>
                            <EditIcon size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {next.includes('CONFIRMED') ? <DropdownMenuItem onSelect={() => setConfirming(assignment)}>Confirm</DropdownMenuItem> : null}
                          {next.includes('COMPLETED') && trip.status === 'IN_PROGRESS' ? (
                            <DropdownMenuItem onSelect={() => changeStatus.mutate({ assignmentId: assignment.id, status: 'COMPLETED' })}>Mark complete</DropdownMenuItem>
                          ) : null}
                          {next.includes('CANCELLED') ? <DropdownMenuItem onSelect={() => setCancelling(assignment)}>Cancel</DropdownMenuItem> : null}
                          {(assignment.status === 'CANCELLED' || assignment.status === 'COMPLETED') ? (
                            <><DropdownMenuSeparator />
                              <DropdownMenuItem className="text-danger focus:text-danger" onSelect={() => setDeleting(assignment)}>
                                <DeleteIcon size={16} />Delete
                              </DropdownMenuItem></>
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
      )}

      {assignOpen ? <AssignResourceDialog key="assign" trip={trip} open onOpenChange={setAssignOpen} /> : null}
      {confirming ? (
        <ConfirmAssignmentDialog open onOpenChange={(next) => { if (!next) setConfirming(null); }}
          name={confirming.resource?.name ?? 'This resource'} roleLabel="an assigned resource"
          pending={changeStatus.isPending}
          onConfirm={() => changeStatus.mutate({ assignmentId: confirming.id, status: 'CONFIRMED' }, { onSuccess: () => setConfirming(null) })} />
      ) : null}
      {cancelling ? (
        <CancelAssignmentDialog open onOpenChange={(next) => { if (!next) setCancelling(null); }}
          name={cancelling.resource?.name ?? 'This resource'} isLeadGuide={false}
          pending={changeStatus.isPending}
          onConfirm={() => changeStatus.mutate({ assignmentId: cancelling.id, status: 'CANCELLED' }, { onSuccess: () => setCancelling(null) })} />
      ) : null}
      {deleting ? (
        <ConfirmDialog open onOpenChange={(next) => { if (!next) setDeleting(null); }}
          title="Delete this assignment?"
          description={`Remove ${deleting.resource?.name ?? 'this resource'} from the trip. It stays in the audit history.`}
          confirmLabel="Delete assignment" variant="danger"
          onConfirm={async () => { await remove.mutateAsync(deleting.id); setDeleting(null); }} />
      ) : null}
    </Card>
  );
}
