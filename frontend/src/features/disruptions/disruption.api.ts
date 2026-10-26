import type {
  CompleteRecoveryTaskInput,
  CreateDisruptionInput,
  CreateRecoveryPlanInput,
  DisruptionDetail,
} from '@trailcomand/shared';

import { apiClient, unwrap, type ApiEnvelope } from '@/lib/api-client';

const base = (workspaceId: string) => `/api/workspaces/${workspaceId}/disruptions`;
const versionedBase = (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/disruptions`;

export const disruptionsApi = {
  list: async (workspaceId: string, tripId?: string, signal?: AbortSignal) =>
    unwrap(await apiClient.get<ApiEnvelope<DisruptionDetail[]>>(versionedBase(workspaceId), {
      params: tripId ? { tripId } : undefined,
      signal,
    })),
  get: async (workspaceId: string, disruptionId: string) =>
    unwrap(await apiClient.get<ApiEnvelope<DisruptionDetail>>(`${versionedBase(workspaceId)}/${disruptionId}`)),
  create: async (workspaceId: string, input: CreateDisruptionInput) =>
    unwrap(await apiClient.post<ApiEnvelope<DisruptionDetail>>(base(workspaceId), input)),
  createPlan: async (workspaceId: string, disruptionId: string, input: CreateRecoveryPlanInput) =>
    unwrap(await apiClient.post<ApiEnvelope<DisruptionDetail>>(`${base(workspaceId)}/${disruptionId}/plan`, input)),
  approvePlan: async (workspaceId: string, disruptionId: string) =>
    unwrap(await apiClient.post<ApiEnvelope<DisruptionDetail>>(`${base(workspaceId)}/${disruptionId}/approve`)),
  completeTask: async (workspaceId: string, taskId: string, input: CompleteRecoveryTaskInput) =>
    unwrap(await apiClient.patch<ApiEnvelope<DisruptionDetail>>(`${base(workspaceId)}/tasks/${taskId}/complete`, input)),
};
