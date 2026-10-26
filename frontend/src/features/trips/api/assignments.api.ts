import type {
  AvailabilityResult, CheckAvailabilityQuery, CreateResourceAssignmentInput, CreateStaffAssignmentInput,
  ResourceAssignmentDetail, StaffAssignmentDetail, UpdateResourceAssignmentInput, UpdateStaffAssignmentInput,
} from '@trailcomand/shared';

import { apiClient, unwrap, type ApiEnvelope } from '@/lib/api-client';

const ws = (workspaceId: string) => `/api/workspaces/${workspaceId}`;

/** Staff assignments live at the workspace root, not under /trips — matches the backend routes. */
export const staffAssignmentsApi = {
  listByTrip: async (workspaceId: string, tripId: string, signal?: AbortSignal) =>
    unwrap(await apiClient.get<ApiEnvelope<StaffAssignmentDetail[]>>(`${ws(workspaceId)}/trips/${tripId}/staff-assignments`, { signal })),

  create: async (workspaceId: string, input: CreateStaffAssignmentInput) =>
    unwrap(await apiClient.post<ApiEnvelope<StaffAssignmentDetail>>(`${ws(workspaceId)}/staff-assignments`, input)),

  update: async (workspaceId: string, assignmentId: string, input: UpdateStaffAssignmentInput) =>
    unwrap(await apiClient.patch<ApiEnvelope<StaffAssignmentDetail>>(`${ws(workspaceId)}/staff-assignments/${assignmentId}`, input)),

  changeStatus: async (workspaceId: string, assignmentId: string, input: { status: string; notes?: string }) =>
    unwrap(await apiClient.patch<ApiEnvelope<StaffAssignmentDetail>>(`${ws(workspaceId)}/staff-assignments/${assignmentId}/status`, input)),

  remove: async (workspaceId: string, assignmentId: string) =>
    unwrap(await apiClient.delete<ApiEnvelope<{ success: boolean; id: string }>>(`${ws(workspaceId)}/staff-assignments/${assignmentId}`)),

  checkAvailability: async (workspaceId: string, query: CheckAvailabilityQuery, signal?: AbortSignal) =>
    unwrap(await apiClient.get<ApiEnvelope<AvailabilityResult>>(`${ws(workspaceId)}/availability/staff`, { params: query, signal })),
};

export const resourceAssignmentsApi = {
  listByTrip: async (workspaceId: string, tripId: string, signal?: AbortSignal) =>
    unwrap(await apiClient.get<ApiEnvelope<ResourceAssignmentDetail[]>>(`${ws(workspaceId)}/trips/${tripId}/resource-assignments`, { signal })),

  create: async (workspaceId: string, input: CreateResourceAssignmentInput) =>
    unwrap(await apiClient.post<ApiEnvelope<ResourceAssignmentDetail>>(`${ws(workspaceId)}/resource-assignments`, input)),

  update: async (workspaceId: string, assignmentId: string, input: UpdateResourceAssignmentInput) =>
    unwrap(await apiClient.patch<ApiEnvelope<ResourceAssignmentDetail>>(`${ws(workspaceId)}/resource-assignments/${assignmentId}`, input)),

  changeStatus: async (workspaceId: string, assignmentId: string, input: { status: string }) =>
    unwrap(await apiClient.patch<ApiEnvelope<ResourceAssignmentDetail>>(`${ws(workspaceId)}/resource-assignments/${assignmentId}/status`, input)),

  remove: async (workspaceId: string, assignmentId: string) =>
    unwrap(await apiClient.delete<ApiEnvelope<{ success: boolean; id: string }>>(`${ws(workspaceId)}/resource-assignments/${assignmentId}`)),

  checkAvailability: async (workspaceId: string, query: { resourceId: string; startDate: string; endDate: string }, signal?: AbortSignal) =>
    unwrap(await apiClient.get<ApiEnvelope<AvailabilityResult>>(`${ws(workspaceId)}/availability/resources`, { params: query, signal })),
};
