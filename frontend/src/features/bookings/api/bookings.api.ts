import type { UpdateBookingInput } from '@trailcomand/shared';
import type { BookingDetail, CancelBookingInput } from '@trailcomand/shared';
import type { ListPaymentsResult, PaymentDetail } from '@trailcomand/shared';
import type { CreatePaymentInput, ListBookingsQuery } from '@trailcomand/shared';
import type { ListBookingsResult, ListPaymentsQuery } from '@trailcomand/shared';

import { apiClient, unwrap, type ApiEnvelope } from '@/lib/api-client';

const base = (workspaceId: string) => `/api/workspaces/${workspaceId}/bookings`;

/** `POST /bookings/:id/payments` returns the new payment plus a booking summary (not full detail). */
export interface RecordPaymentResult {
  payment: PaymentDetail;
  booking: Pick<BookingDetail, 'id' | 'totalAmount' | 'paidAmount' | 'balanceAmount' | 'status'>;
}

export const bookingsApi = {
  list: async (workspaceId: string, params: ListBookingsQuery, signal?: AbortSignal) =>
    unwrap(await apiClient.get<ApiEnvelope<ListBookingsResult>>(base(workspaceId), { params, signal })),
  get: async (workspaceId: string, bookingId: string) =>
    unwrap(await apiClient.get<ApiEnvelope<BookingDetail>>(`${base(workspaceId)}/${bookingId}`)),
  update: async (workspaceId: string, bookingId: string, input: UpdateBookingInput) =>
    unwrap(await apiClient.patch<ApiEnvelope<BookingDetail>>(`${base(workspaceId)}/${bookingId}`, input)),
  cancel: async (workspaceId: string, bookingId: string, input: CancelBookingInput) =>
    unwrap(await apiClient.post<ApiEnvelope<BookingDetail>>(`${base(workspaceId)}/${bookingId}/cancel`, input)),
  complete: async (workspaceId: string, bookingId: string) =>
    unwrap(await apiClient.post<ApiEnvelope<BookingDetail>>(`${base(workspaceId)}/${bookingId}/complete`, {})),
  payments: async (workspaceId: string, bookingId: string, params: Pick<ListPaymentsQuery, "limit" | "offset"> = { limit: 100, offset: 0 }, signal?: AbortSignal) =>
    unwrap(await apiClient.get<ApiEnvelope<ListPaymentsResult>>(`${base(workspaceId)}/${bookingId}/payments`, { params, signal })),
  recordPayment: async (workspaceId: string, bookingId: string, input: CreatePaymentInput) =>
    unwrap(await apiClient.post<ApiEnvelope<RecordPaymentResult>>(`${base(workspaceId)}/${bookingId}/payments`, input)),
};
