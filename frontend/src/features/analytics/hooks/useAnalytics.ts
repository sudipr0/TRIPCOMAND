import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  analyticsApi,
  type AnalyticsExportParams,
} from "@/features/analytics/api/analytics.api";
import { useWorkspaceStore } from "@/stores/workspace.store";

export const analyticsKeys = {
  all: (workspaceId: string, year: number) =>
    ["analytics", workspaceId, year] as const,
  kpis: (workspaceId: string, year: number) =>
    [...analyticsKeys.all(workspaceId, year), "kpis"] as const,
  profitability: (
    workspaceId: string,
    year: number,
    params: Record<string, unknown>,
  ) => [...analyticsKeys.all(workspaceId, year), "profitability", params] as const,
  suppliers: (workspaceId: string, year: number, minBookings: number) =>
    [...analyticsKeys.all(workspaceId, year), "suppliers", minBookings] as const,
  operations: (workspaceId: string, year: number) =>
    [...analyticsKeys.all(workspaceId, year), "operations"] as const,
};

function requireWorkspace(id: string | null): string {
  if (!id) throw new Error("No workspace selected");
  return id;
}

/** Aggregations are derived on read, so a short stale window is enough. */
const staleTime = 60_000;

export function useDashboardKpis(year: number) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: analyticsKeys.kpis(workspaceId ?? "", year),
    queryFn: ({ signal }) =>
      analyticsApi.kpis(requireWorkspace(workspaceId), year, signal),
    enabled: Boolean(workspaceId),
    staleTime,
  });
}

export function useTripProfitability(params: {
  year: number;
  status?: string;
  sort?: string;
  direction?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: analyticsKeys.profitability(workspaceId ?? "", params.year, params),
    queryFn: ({ signal }) =>
      analyticsApi.tripProfitability(
        requireWorkspace(workspaceId),
        params,
        signal,
      ),
    enabled: Boolean(workspaceId),
    staleTime,
  });
}

export function useSupplierReliability(year: number, minBookings: number) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: analyticsKeys.suppliers(workspaceId ?? "", year, minBookings),
    queryFn: ({ signal }) =>
      analyticsApi.suppliers(
        requireWorkspace(workspaceId),
        { year, minBookings },
        signal,
      ),
    enabled: Boolean(workspaceId),
    staleTime,
  });
}

export function useOperationalAnalytics(year: number) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: analyticsKeys.operations(workspaceId ?? "", year),
    queryFn: ({ signal }) =>
      analyticsApi.operations(requireWorkspace(workspaceId), year, signal),
    enabled: Boolean(workspaceId),
    staleTime,
  });
}

/** Triggers a server-side CSV export and hands the file to the browser. */
export function useAnalyticsExport() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useMutation({
    mutationFn: (params: AnalyticsExportParams) =>
      analyticsApi.exportCsv(requireWorkspace(workspaceId), params),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error("Could not export this report."),
  });
}
