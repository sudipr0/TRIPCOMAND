import type {
  CreateDestinationInput,
  DestinationDetail,
  ListDestinationsQuery,
  ListDestinationsResult,
  UpdateDestinationInput,
} from '@tripchange/shared';

import { apiClient, unwrap, type ApiEnvelope } from '@/lib/api-client';

const base = (workspaceId: string) => `/api/workspaces/${workspaceId}/destinations`;

export const destinationsApi = {
  list: async (workspaceId: string, params: ListDestinationsQuery) =>
    unwrap(await apiClient.get<ApiEnvelope<ListDestinationsResult>>(base(workspaceId), { params })),
  get: async (workspaceId: string, destinationId: string) =>
    unwrap(await apiClient.get<ApiEnvelope<DestinationDetail>>(`${base(workspaceId)}/${destinationId}`)),
  create: async (workspaceId: string, input: CreateDestinationInput) =>
    unwrap(await apiClient.post<ApiEnvelope<DestinationDetail>>(base(workspaceId), input)),
  update: async (workspaceId: string, destinationId: string, input: UpdateDestinationInput) =>
    unwrap(await apiClient.patch<ApiEnvelope<DestinationDetail>>(`${base(workspaceId)}/${destinationId}`, input)),
  delete: async (workspaceId: string, destinationId: string) =>
    unwrap(await apiClient.delete<ApiEnvelope<{ success: true; id: string }>>(`${base(workspaceId)}/${destinationId}`)),
};
