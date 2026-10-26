import type {
  CreateCheckInInput,
  CreateFieldReportInput,
  FieldCheckInDetail,
  FieldReportDetail,
  FieldTripList,
  TripFieldData,
} from '@trailcomand/shared';

import { apiClient, unwrap, type ApiEnvelope } from '@/lib/api-client';

const base = (workspaceId: string) => `/api/workspaces/${workspaceId}`;
const tripBase = (workspaceId: string, tripId: string) =>
  `${base(workspaceId)}/trips/${tripId}`;

export const fieldApi = {
  trips: async (workspaceId: string, signal?: AbortSignal) =>
    unwrap(
      await apiClient.get<ApiEnvelope<FieldTripList>>(`${base(workspaceId)}/field/trips`, {
        signal,
      }),
    ),

  getFieldData: async (workspaceId: string, tripId: string, signal?: AbortSignal) =>
    unwrap(
      await apiClient.get<ApiEnvelope<TripFieldData>>(
        `${tripBase(workspaceId, tripId)}/field-data`,
        { signal },
      ),
    ),

  createCheckIn: async (workspaceId: string, tripId: string, input: CreateCheckInInput) =>
    unwrap(
      await apiClient.post<ApiEnvelope<FieldCheckInDetail>>(
        `${tripBase(workspaceId, tripId)}/check-ins`,
        input,
      ),
    ),

  createReport: async (workspaceId: string, tripId: string, input: CreateFieldReportInput) =>
    unwrap(
      await apiClient.post<ApiEnvelope<FieldReportDetail>>(
        `${tripBase(workspaceId, tripId)}/reports`,
        input,
      ),
    ),
};
