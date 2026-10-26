import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { AssignTripInput, BulkAddTravelersInput, ChangeTripStatusInput, CreateItineraryDayInput, CreateResourceAssignmentInput, CreateStaffAssignmentInput, CreateTripTravelerInput, DayStatusValue, ListTripsQuery, PopulateFromTemplateInput, PublishItineraryInput, ReorderItineraryDaysInput, UpdateItineraryDayInput, UpdateTripInput, UpdateTripTravelerInput } from '@trailcomand/shared';

import { fromDateInput } from '@/lib/utils';
import { extractError } from '@/lib/api-client';
import { tripsApi } from '@/features/trips/api/trips.api';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { resourceAssignmentsApi, staffAssignmentsApi } from '@/features/trips/api/assignments.api';

export const tripKeys = {
  all: (workspaceId: string) => ['trips', workspaceId] as const,
  lists: (workspaceId: string) => [...tripKeys.all(workspaceId), 'list'] as const,
  list: (workspaceId: string, filters: ListTripsQuery) => [...tripKeys.lists(workspaceId), filters] as const,
  detail: (workspaceId: string, tripId: string) => [...tripKeys.all(workspaceId), 'detail', tripId] as const,
  readiness: (workspaceId: string, tripId: string) => [...tripKeys.all(workspaceId), 'readiness', tripId] as const,
  versions: (workspaceId: string, tripId: string) => [...tripKeys.all(workspaceId), 'versions', tripId] as const,
};

function requireWorkspace(id: string | null): string {
  if (!id) throw new Error('No workspace selected');
  return id;
}

function showError(error: unknown, fallback: string) {
  toast.error(extractError(error)?.message ?? (error instanceof Error ? error.message : fallback));
}

/** Readiness is never stored — every trip mutation can change it, so all of them refresh it. */
function invalidateTrip(queryClient: QueryClient, workspaceId: string, tripId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: tripKeys.detail(workspaceId, tripId) }),
    queryClient.invalidateQueries({ queryKey: tripKeys.readiness(workspaceId, tripId) }),
    queryClient.invalidateQueries({ queryKey: tripKeys.lists(workspaceId) }),
  ]);
}

export function useTrips(filters: ListTripsQuery) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: tripKeys.list(workspaceId ?? '', filters),
    queryFn: ({ signal }) => tripsApi.list(requireWorkspace(workspaceId), filters, signal),
    enabled: Boolean(workspaceId),
  });
}

export function useTrip(tripId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: tripKeys.detail(workspaceId ?? '', tripId ?? ''),
    queryFn: () => tripsApi.get(requireWorkspace(workspaceId), tripId!),
    enabled: Boolean(workspaceId && tripId),
  });
}

export function useTripReadiness(tripId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: tripKeys.readiness(workspaceId ?? '', tripId ?? ''),
    queryFn: () => tripsApi.readiness(requireWorkspace(workspaceId), tripId!),
    enabled: Boolean(workspaceId && tripId),
  });
}

export function useUpdateTrip(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTripInput) => tripsApi.update(requireWorkspace(workspaceId), tripId, input),
    onSuccess: (trip) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(tripKeys.detail(id, tripId), trip);
      toast.success('Trip updated');
      return invalidateTrip(queryClient, id, tripId);
    },
    onError: (error) => showError(error, 'Could not update the trip'),
  });
}

export function useUpdateTripStatus(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeTripStatusInput) => tripsApi.updateStatus(requireWorkspace(workspaceId), tripId, input),
    onSuccess: (trip) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(tripKeys.detail(id, tripId), trip);
      toast.success(`Trip marked ${trip.status.replace('_', ' ').toLowerCase()}`);
      return invalidateTrip(queryClient, id, tripId);
    },
    onError: (error) => showError(error, 'Could not change the trip status'),
  });
}

export function useAssignTrip(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignTripInput) => tripsApi.assign(requireWorkspace(workspaceId), tripId, input),
    onSuccess: (trip) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(tripKeys.detail(id, tripId), trip);
      toast.success('Assignment updated');
      return invalidateTrip(queryClient, id, tripId);
    },
    onError: (error) => showError(error, 'Could not update the assignment'),
  });
}

export function useDeleteTrip() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => tripsApi.remove(requireWorkspace(workspaceId), tripId),
    onSuccess: () => {
      const id = requireWorkspace(workspaceId);
      toast.success('Trip deleted');
      return queryClient.invalidateQueries({ queryKey: tripKeys.lists(id) });
    },
    onError: (error) => showError(error, 'Could not delete the trip'),
  });
}

// ── Travelers ────────────────────────────────────────────────────────────────

export function useAddTraveler(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTripTravelerInput) => tripsApi.addTraveler(requireWorkspace(workspaceId), tripId, input),
    onSuccess: () => {
      toast.success('Traveler added');
      return invalidateTrip(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not add the traveler'),
  });
}

export function useBulkAddTravelers(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkAddTravelersInput) => tripsApi.bulkAddTravelers(requireWorkspace(workspaceId), tripId, input),
    onSuccess: () => invalidateTrip(queryClient, requireWorkspace(workspaceId), tripId),
    onError: (error) => showError(error, 'Could not add travelers'),
  });
}

export function useUpdateTraveler(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ travelerId, input }: { travelerId: string; input: UpdateTripTravelerInput }) =>
      tripsApi.updateTraveler(requireWorkspace(workspaceId), tripId, travelerId, input),
    onSuccess: () => {
      toast.success('Traveler updated');
      return invalidateTrip(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not update the traveler'),
  });
}

export function useDeleteTraveler(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (travelerId: string) => tripsApi.deleteTraveler(requireWorkspace(workspaceId), tripId, travelerId),
    onSuccess: () => {
      toast.success('Traveler removed');
      return invalidateTrip(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not remove the traveler'),
  });
}

// ── Itinerary ────────────────────────────────────────────────────────────────

export function useCreateDay(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateItineraryDayInput) => tripsApi.createDay(requireWorkspace(workspaceId), tripId, input),
    onSuccess: () => {
      toast.success('Day added');
      return invalidateTrip(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not add the day'),
  });
}

export function useUpdateDay(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, input }: { dayId: string; input: UpdateItineraryDayInput }) =>
      tripsApi.updateDay(requireWorkspace(workspaceId), tripId, dayId, input),
    onSuccess: () => {
      toast.success('Day updated');
      return invalidateTrip(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not update the day'),
  });
}

export function useUpdateDayStatus(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dayId, status }: { dayId: string; status: DayStatusValue }) =>
      tripsApi.updateDayStatus(requireWorkspace(workspaceId), tripId, dayId, status),
    onSuccess: () => {
      return invalidateTrip(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not change the day status'),
  });
}

export function useDeleteDay(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dayId: string) => tripsApi.deleteDay(requireWorkspace(workspaceId), tripId, dayId),
    onSuccess: () => {
      toast.success('Day removed');
      return invalidateTrip(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not remove the day'),
  });
}

export function usePopulateFromTemplate(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PopulateFromTemplateInput) => tripsApi.populateFromTemplate(requireWorkspace(workspaceId), tripId, input),
    onSuccess: (days) => {
      toast.success(`Itinerary populated with ${Array.isArray(days) ? days.length : 0} days`);
      return invalidateTrip(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not populate the itinerary'),
  });
}

export function useReorderDays(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderItineraryDaysInput) => tripsApi.reorderDays(requireWorkspace(workspaceId), tripId, input),
    onSuccess: () => invalidateTrip(queryClient, requireWorkspace(workspaceId), tripId),
    onError: (error) => showError(error, 'Could not reorder the days'),
  });
}

export function usePublishItinerary(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishItineraryInput) => tripsApi.publish(requireWorkspace(workspaceId), tripId, input),
    onSuccess: (version) => {
      toast.success(`Itinerary published as v${version.version}`);
      return Promise.all([
        invalidateTrip(queryClient, requireWorkspace(workspaceId), tripId),
        queryClient.invalidateQueries({ queryKey: tripKeys.versions(requireWorkspace(workspaceId), tripId) }),
      ]);
    },
    onError: (error) => showError(error, 'Could not publish the itinerary'),
  });
}

export function useItineraryVersions(tripId: string | undefined, enabled = true) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: tripKeys.versions(workspaceId ?? '', tripId ?? ''),
    queryFn: ({ signal }) => tripsApi.versions(requireWorkspace(workspaceId), tripId!, signal),
    enabled: Boolean(workspaceId && tripId && enabled),
  });
}
// ── Assignments (Phase 5) ────────────────────────────────────────────────────

export const assignmentKeys = {
  staff: (workspaceId: string, tripId: string) => [...tripKeys.all(workspaceId), 'staff-assignments', tripId] as const,
  resources: (workspaceId: string, tripId: string) => [...tripKeys.all(workspaceId), 'resource-assignments', tripId] as const,
};

/**
 * Any assignment change can move Trip.leadGuideId and therefore readiness, so every
 * assignment mutation refreshes the assignments for the trip plus the trip itself.
 */
function invalidateAssignments(queryClient: QueryClient, workspaceId: string, tripId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: assignmentKeys.staff(workspaceId, tripId) }),
    queryClient.invalidateQueries({ queryKey: assignmentKeys.resources(workspaceId, tripId) }),
    invalidateTrip(queryClient, workspaceId, tripId),
  ]);
}

export function useStaffAssignments(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: assignmentKeys.staff(workspaceId ?? '', tripId),
    queryFn: ({ signal }) => staffAssignmentsApi.listByTrip(requireWorkspace(workspaceId), tripId, signal),
    enabled: Boolean(workspaceId && tripId),
  });
}

export function useCreateStaffAssignment(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffAssignmentInput) => staffAssignmentsApi.create(requireWorkspace(workspaceId), input),
    onSuccess: () => {
      toast.success('Staff assigned');
      return invalidateAssignments(queryClient, requireWorkspace(workspaceId), tripId);
    },
    // Conflicts are surfaced inline by the caller (409 STAFF_CONFLICT), so no toast here.
    onError: (error) => {
      const code = extractError(error)?.code;
      if (code !== 'STAFF_CONFLICT') showError(error, 'Could not assign staff');
    },
  });
}

export function useChangeStaffAssignmentStatus(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, status, notes }: { assignmentId: string; status: string; notes?: string }) =>
      staffAssignmentsApi.changeStatus(requireWorkspace(workspaceId), assignmentId, { status, notes }),
    onSuccess: (assignment) => {
      toast.success(`Assignment ${assignment.status.toLowerCase()}`);
      return invalidateAssignments(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not update the assignment'),
  });
}

export function useDeleteStaffAssignment(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => staffAssignmentsApi.remove(requireWorkspace(workspaceId), assignmentId),
    onSuccess: () => {
      toast.success('Assignment deleted');
      return invalidateAssignments(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not delete the assignment'),
  });
}

export function useStaffAvailability(staffId: string | undefined, startDate: string | undefined, endDate: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: [...tripKeys.all(workspaceId ?? ''), 'availability', 'staff', staffId ?? '', startDate ?? '', endDate ?? ''],
    queryFn: ({ signal }) => staffAssignmentsApi.checkAvailability(requireWorkspace(workspaceId),
      { staffId: staffId!, startDate: fromDateInput(startDate!), endDate: fromDateInput(endDate!) }, signal),
    enabled: Boolean(workspaceId && staffId && startDate && endDate),
  });
}

export function useResourceAssignments(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: assignmentKeys.resources(workspaceId ?? '', tripId),
    queryFn: ({ signal }) => resourceAssignmentsApi.listByTrip(requireWorkspace(workspaceId), tripId, signal),
    enabled: Boolean(workspaceId && tripId),
  });
}

export function useCreateResourceAssignment(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateResourceAssignmentInput) => resourceAssignmentsApi.create(requireWorkspace(workspaceId), input),
    onSuccess: () => {
      toast.success('Resource assigned');
      return invalidateAssignments(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => {
      const code = extractError(error)?.code;
      if (code !== 'RESOURCE_CONFLICT') showError(error, 'Could not assign the resource');
    },
  });
}

export function useChangeResourceAssignmentStatus(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, status }: { assignmentId: string; status: string }) =>
      resourceAssignmentsApi.changeStatus(requireWorkspace(workspaceId), assignmentId, { status }),
    onSuccess: (assignment) => {
      toast.success(`Assignment ${assignment.status.toLowerCase()}`);
      return invalidateAssignments(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not update the assignment'),
  });
}

export function useDeleteResourceAssignment(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => resourceAssignmentsApi.remove(requireWorkspace(workspaceId), assignmentId),
    onSuccess: () => {
      toast.success('Assignment deleted');
      return invalidateAssignments(queryClient, requireWorkspace(workspaceId), tripId);
    },
    onError: (error) => showError(error, 'Could not delete the assignment'),
  });
}

export function useResourceAvailability(resourceId: string | undefined, startDate: string | undefined, endDate: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: [...tripKeys.all(workspaceId ?? ''), 'availability', 'resource', resourceId ?? '', startDate ?? '', endDate ?? ''],
    queryFn: ({ signal }) => resourceAssignmentsApi.checkAvailability(requireWorkspace(workspaceId),
      { resourceId: resourceId!, startDate: fromDateInput(startDate!), endDate: fromDateInput(endDate!) }, signal),
    enabled: Boolean(workspaceId && resourceId && startDate && endDate),
  });
}
