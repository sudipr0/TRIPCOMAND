import type {
  BookingDetail,
  CreateQuotationInput,
  InquiryDetail,
  ListQuotationsQuery,
  ListQuotationsResult,
  QuotationDetail,
  TripDetail,
  UpdateQuotationInput,
} from "@tripchange/shared";

import { apiClient, unwrap, type ApiEnvelope } from "@/lib/api-client";

const base = (workspaceId: string) =>
  `/api/workspaces/${workspaceId}/quotations`;

/** `POST /quotations/:id/convert` returns the quotation, the new booking, and the auto-created trip. */
export interface ConvertQuotationResult {
  quotation: QuotationDetail;
  booking: BookingDetail;
  trip: TripDetail;
}

export const quotationsApi = {
  list: async (
    workspaceId: string,
    params: ListQuotationsQuery,
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<ListQuotationsResult>>(
        base(workspaceId),
        { params, signal },
      ),
    ),
  get: async (workspaceId: string, quotationId: string) =>
    unwrap(
      await apiClient.get<ApiEnvelope<QuotationDetail>>(
        `${base(workspaceId)}/${quotationId}`,
      ),
    ),
  create: async (workspaceId: string, input: CreateQuotationInput) =>
    unwrap(
      await apiClient.post<ApiEnvelope<QuotationDetail>>(
        base(workspaceId),
        input,
      ),
    ),
  update: async (
    workspaceId: string,
    quotationId: string,
    input: UpdateQuotationInput,
  ) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<QuotationDetail>>(
        `${base(workspaceId)}/${quotationId}`,
        input,
      ),
    ),
  delete: async (workspaceId: string, quotationId: string) =>
    unwrap(
      await apiClient.delete<ApiEnvelope<{ success: true; id: string }>>(
        `${base(workspaceId)}/${quotationId}`,
      ),
    ),
  // send/accept/reject all take an object body; the backend schemas are `.strict()`.
  send: async (workspaceId: string, quotationId: string) =>
    unwrap(
      await apiClient.post<ApiEnvelope<QuotationDetail>>(
        `${base(workspaceId)}/${quotationId}/send`,
        {},
      ),
    ),
  accept: async (workspaceId: string, quotationId: string) =>
    unwrap(
      await apiClient.post<ApiEnvelope<QuotationDetail>>(
        `${base(workspaceId)}/${quotationId}/accept`,
        {},
      ),
    ),
  reject: async (workspaceId: string, quotationId: string, reason: string) =>
    unwrap(
      await apiClient.post<ApiEnvelope<QuotationDetail>>(
        `${base(workspaceId)}/${quotationId}/reject`,
        { reason },
      ),
    ),
  convert: async (workspaceId: string, quotationId: string) =>
    unwrap(
      await apiClient.post<ApiEnvelope<ConvertQuotationResult>>(
        `${base(workspaceId)}/${quotationId}/convert`,
      ),
    ),
  // The linked inquiry is not moved to QUOTED by the quotation service; the client does it explicitly.
  markInquiryQuoted: async (workspaceId: string, inquiryId: string) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<InquiryDetail>>(
        `/api/workspaces/${workspaceId}/inquiries/${inquiryId}`,
        { status: "QUOTED" },
      ),
    ),
};
