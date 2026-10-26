import type {
  ConfirmSupplierBookingInput,
  CreateSupplierBookingInput,
  RecordSupplierBookingActualCostInput,
  RecordSupplierQuoteInput,
  SupplierBookingDetail,
  UpdateSupplierBookingInput,
} from "@trailcomand/shared";

import { apiClient, unwrap, type ApiEnvelope } from "@/lib/api-client";

const ws = (workspaceId: string) => `/api/workspaces/${workspaceId}`;
const one = (workspaceId: string, bookingId: string) =>
  `${ws(workspaceId)}/supplier-bookings/${bookingId}`;

export const supplierBookingsApi = {
  listByTrip: async (
    workspaceId: string,
    tripId: string,
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<SupplierBookingDetail[]>>(
        `${ws(workspaceId)}/trips/${tripId}/supplier-bookings`,
        { signal },
      ),
    ),

  listBySupplier: async (
    workspaceId: string,
    supplierId: string,
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<SupplierBookingDetail[]>>(
        `${ws(workspaceId)}/suppliers/${supplierId}/bookings`,
        { signal },
      ),
    ),

  deadlines: async (
    workspaceId: string,
    withinHours: number,
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<SupplierBookingDetail[]>>(
        `${ws(workspaceId)}/supplier-bookings/deadlines`,
        { params: { withinHours }, signal },
      ),
    ),

  create: async (workspaceId: string, input: CreateSupplierBookingInput) =>
    unwrap(
      await apiClient.post<ApiEnvelope<SupplierBookingDetail>>(
        `${ws(workspaceId)}/supplier-bookings`,
        input,
      ),
    ),

  get: async (workspaceId: string, bookingId: string) =>
    unwrap(
      await apiClient.get<ApiEnvelope<SupplierBookingDetail>>(
        one(workspaceId, bookingId),
      ),
    ),

  update: async (
    workspaceId: string,
    bookingId: string,
    input: UpdateSupplierBookingInput,
  ) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<SupplierBookingDetail>>(
        one(workspaceId, bookingId),
        input,
      ),
    ),

  remove: async (workspaceId: string, bookingId: string) =>
    unwrap(
      await apiClient.delete<ApiEnvelope<{ success: boolean; id: string }>>(
        one(workspaceId, bookingId),
      ),
    ),

  requestQuote: async (workspaceId: string, bookingId: string) =>
    unwrap(
      await apiClient.post<ApiEnvelope<SupplierBookingDetail>>(
        `${one(workspaceId, bookingId)}/request`,
      ),
    ),

  recordQuote: async (
    workspaceId: string,
    bookingId: string,
    input: RecordSupplierQuoteInput,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<SupplierBookingDetail>>(
        `${one(workspaceId, bookingId)}/record-quote`,
        input,
      ),
    ),

  confirm: async (
    workspaceId: string,
    bookingId: string,
    input: ConfirmSupplierBookingInput,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<SupplierBookingDetail>>(
        `${one(workspaceId, bookingId)}/confirm`,
        input,
      ),
    ),

  markInProgress: async (workspaceId: string, bookingId: string) =>
    unwrap(
      await apiClient.post<ApiEnvelope<SupplierBookingDetail>>(
        `${one(workspaceId, bookingId)}/in-progress`,
      ),
    ),

  complete: async (workspaceId: string, bookingId: string) =>
    unwrap(
      await apiClient.post<ApiEnvelope<SupplierBookingDetail>>(
        `${one(workspaceId, bookingId)}/complete`,
      ),
    ),

  cancel: async (
    workspaceId: string,
    bookingId: string,
    input: { reason: string },
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<SupplierBookingDetail>>(
        `${one(workspaceId, bookingId)}/cancel`,
        input,
      ),
    ),

  noShow: async (workspaceId: string, bookingId: string) =>
    unwrap(
      await apiClient.post<ApiEnvelope<SupplierBookingDetail>>(
        `${one(workspaceId, bookingId)}/no-show`,
      ),
    ),

  recordActualCost: async (
    workspaceId: string,
    bookingId: string,
    input: RecordSupplierBookingActualCostInput,
  ) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<SupplierBookingDetail>>(
        `${one(workspaceId, bookingId)}/actual-cost`,
        input,
      ),
    ),
};
