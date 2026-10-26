import type {
  FinanceSummaryQuery,
  TripFinancialsResponse,
  WorkspaceFinancialSummary,
} from '@trailcomand/shared';

import { apiClient, unwrap, type ApiEnvelope } from '@/lib/api-client';

const base = (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/finance`;

export const financeApi = {
  trip: async (workspaceId: string, tripId: string, signal?: AbortSignal) =>
    unwrap(
      await apiClient.get<ApiEnvelope<TripFinancialsResponse>>(
        `${base(workspaceId)}/trips/${tripId}`,
        { signal },
      ),
    ),

  summary: async (workspaceId: string, params: FinanceSummaryQuery = {}, signal?: AbortSignal) =>
    unwrap(
      await apiClient.get<ApiEnvelope<WorkspaceFinancialSummary>>(
        `${base(workspaceId)}/summary`,
        { params, signal },
      ),
    ),
};
