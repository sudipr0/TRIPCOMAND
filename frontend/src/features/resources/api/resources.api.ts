import type {
  CreateResourceInput,
  ListResourcesQuery,
  ListResourcesResult,
  ResourceDetail,
  UpdateResourceInput,
} from "@tripchange/shared";

import { apiClient, unwrap, type ApiEnvelope } from "@/lib/api-client";

const base = (workspaceId: string) =>
  `/api/workspaces/${workspaceId}/resources`;

export const resourcesApi = {
  list: async (
    workspaceId: string,
    params: ListResourcesQuery,
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<ListResourcesResult>>(base(workspaceId), {
        params,
        signal,
      }),
    ),

  get: async (workspaceId: string, resourceId: string) =>
    unwrap(
      await apiClient.get<ApiEnvelope<ResourceDetail>>(
        `${base(workspaceId)}/${resourceId}`,
      ),
    ),

  create: async (workspaceId: string, input: CreateResourceInput) =>
    unwrap(
      await apiClient.post<ApiEnvelope<ResourceDetail>>(
        base(workspaceId),
        input,
      ),
    ),

  update: async (
    workspaceId: string,
    resourceId: string,
    input: UpdateResourceInput,
  ) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<ResourceDetail>>(
        `${base(workspaceId)}/${resourceId}`,
        input,
      ),
    ),

  remove: async (workspaceId: string, resourceId: string) =>
    unwrap(
      await apiClient.delete<ApiEnvelope<{ success: boolean; id: string }>>(
        `${base(workspaceId)}/${resourceId}`,
      ),
    ),
};
