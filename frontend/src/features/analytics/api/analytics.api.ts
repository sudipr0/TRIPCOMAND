import type { TripProfitabilityReport } from '@trailcomand/shared';
import type { SupplierReliabilityReport } from '@trailcomand/shared';
import type { DashboardKpis, OperationalAnalytics } from '@trailcomand/shared';

import { apiClient, unwrap, type ApiEnvelope } from "@/lib/api-client";

const base = (workspaceId: string) =>
  `/api/v1/workspaces/${workspaceId}/analytics`;

export interface AnalyticsExportParams {
  report:
    | "trip-profitability"
    | "supplier-reliability"
    | "dashboard-kpis"
    | "operational";
  year: number;
  minBookings?: number;
  includeIncomplete?: boolean;
}

export const analyticsApi = {
  kpis: async (workspaceId: string, year: number, signal?: AbortSignal) =>
    unwrap(
      await apiClient.get<ApiEnvelope<DashboardKpis>>(
        `${base(workspaceId)}/kpis`,
        { params: { year }, signal },
      ),
    ),

  tripProfitability: async (
    workspaceId: string,
    params: {
      year: number;
      status?: string;
      sort?: string;
      direction?: "asc" | "desc";
      limit?: number;
      offset?: number;
    },
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<TripProfitabilityReport>>(
        `${base(workspaceId)}/trip-profitability`,
        { params, signal },
      ),
    ),

  suppliers: async (
    workspaceId: string,
    params: { year: number; minBookings?: number },
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<SupplierReliabilityReport>>(
        `${base(workspaceId)}/suppliers`,
        { params, signal },
      ),
    ),

  operations: async (workspaceId: string, year: number, signal?: AbortSignal) =>
    unwrap(
      await apiClient.get<ApiEnvelope<OperationalAnalytics>>(
        `${base(workspaceId)}/operations`,
        { params: { year }, signal },
      ),
    ),

  /**
   * Downloads a CSV through the authenticated client. The backend re-checks
   * permissions and tenant scope, so the browser never needs a signed URL.
   */
  exportCsv: async (workspaceId: string, params: AnalyticsExportParams) => {
    const response = await apiClient.get<Blob>(`${base(workspaceId)}/export`, {
      params: {
        report: params.report,
        year: params.year,
        ...(params.minBookings !== undefined
          ? { minBookings: params.minBookings }
          : {}),
        ...(params.includeIncomplete !== undefined
          ? { includeIncomplete: params.includeIncomplete }
          : {}),
      },
      responseType: "blob",
    });

    const disposition = response.headers["content-disposition"] as
      string | undefined;
    const match = disposition?.match(/filename="([^"]+)"/i);
    return {
      blob: response.data,
      filename: match?.[1] ?? `export-${params.year}.csv`,
    };
  },
};
