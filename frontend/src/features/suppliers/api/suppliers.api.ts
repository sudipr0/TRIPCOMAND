import type {
  CreateSupplierInput,
  CreateSupplierRateInput,
  ListSupplierRatesQuery,
  ListSuppliersQuery,
  ListSuppliersResult,
  SupplierAlternative,
  SupplierDetail,
  SupplierRateDetail,
  UpdateSupplierInput,
  UpdateSupplierRateInput,
} from "@trailcomand/shared";

import { apiClient, unwrap, type ApiEnvelope } from "@/lib/api-client";

const base = (workspaceId: string) =>
  `/api/workspaces/${workspaceId}/suppliers`;
const one = (workspaceId: string, supplierId: string) =>
  `${base(workspaceId)}/${supplierId}`;

export interface ActiveBookingsSummary {
  count: number;
}

export const suppliersApi = {
  list: async (
    workspaceId: string,
    params: ListSuppliersQuery,
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<ListSuppliersResult>>(base(workspaceId), {
        params,
        signal,
      }),
    ),

  get: async (workspaceId: string, supplierId: string) =>
    unwrap(
      await apiClient.get<ApiEnvelope<SupplierDetail>>(
        one(workspaceId, supplierId),
      ),
    ),

  create: async (workspaceId: string, input: CreateSupplierInput) =>
    unwrap(
      await apiClient.post<ApiEnvelope<SupplierDetail>>(
        base(workspaceId),
        input,
      ),
    ),

  update: async (
    workspaceId: string,
    supplierId: string,
    input: UpdateSupplierInput,
  ) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<SupplierDetail>>(
        one(workspaceId, supplierId),
        input,
      ),
    ),

  remove: async (workspaceId: string, supplierId: string) =>
    unwrap(
      await apiClient.delete<ApiEnvelope<{ success: boolean; id: string }>>(
        one(workspaceId, supplierId),
      ),
    ),

  rates: async (
    workspaceId: string,
    supplierId: string,
    params: ListSupplierRatesQuery,
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<
        ApiEnvelope<{ total: number; items: SupplierRateDetail[] }>
      >(`${one(workspaceId, supplierId)}/rates`, { params, signal }),
    ),

  createRate: async (
    workspaceId: string,
    supplierId: string,
    input: CreateSupplierRateInput,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<SupplierRateDetail>>(
        `${one(workspaceId, supplierId)}/rates`,
        input,
      ),
    ),

  updateRate: async (
    workspaceId: string,
    supplierId: string,
    rateId: string,
    input: UpdateSupplierRateInput,
  ) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<SupplierRateDetail>>(
        `${one(workspaceId, supplierId)}/rates/${rateId}`,
        input,
      ),
    ),

  deleteRate: async (workspaceId: string, supplierId: string, rateId: string) =>
    unwrap(
      await apiClient.delete<ApiEnvelope<{ success: boolean; id: string }>>(
        `${one(workspaceId, supplierId)}/rates/${rateId}`,
      ),
    ),

  alternatives: async (
    workspaceId: string,
    supplierId: string,
    params: { region?: string; limit?: number },
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<SupplierAlternative[]>>(
        `${one(workspaceId, supplierId)}/alternatives`,
        { params, signal },
      ),
    ),

  activeBookings: async (
    workspaceId: string,
    supplierId: string,
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<ActiveBookingsSummary>>(
        `${one(workspaceId, supplierId)}/active-bookings`,
        { signal },
      ),
    ),
};
