import { useQuery } from '@tanstack/react-query';
import type { FinanceSummaryQuery } from '@trailcomand/shared';

import { financeApi } from '@/features/finance/api/finance.api';
import { useWorkspaceStore } from '@/stores/workspace.store';

export const financeKeys = {
  all: (workspaceId: string) => ['finance', workspaceId] as const,
  trip: (workspaceId: string, tripId: string) => [...financeKeys.all(workspaceId), 'trip', tripId] as const,
  summary: (workspaceId: string, filters: FinanceSummaryQuery) =>
    [...financeKeys.all(workspaceId), 'summary', filters] as const,
};

function requireWorkspace(id: string | null): string {
  if (!id) throw new Error('No workspace selected');
  return id;
}

/** Derived on every read, so the cache is short-lived and always refetched on mount. */
const staleTime = 30_000;

export function useTripFinancials(tripId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: financeKeys.trip(workspaceId ?? '', tripId ?? ''),
    queryFn: ({ signal }) => financeApi.trip(requireWorkspace(workspaceId), tripId!, signal),
    enabled: Boolean(workspaceId && tripId),
    staleTime,
  });
}

export function useWorkspaceFinancials(filters: FinanceSummaryQuery = {}) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: financeKeys.summary(workspaceId ?? '', filters),
    queryFn: ({ signal }) => financeApi.summary(requireWorkspace(workspaceId), filters, signal),
    enabled: Boolean(workspaceId),
    staleTime,
  });
}
