import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CancelBookingInput, CreatePaymentInput, ListBookingsQuery, UpdateBookingInput } from '@trailcomand/shared';

import { extractError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { bookingsApi } from '@/features/bookings/api/bookings.api';

export const bookingKeys = {
  all: (workspaceId: string) => ['bookings', workspaceId] as const,
  lists: (workspaceId: string) => [...bookingKeys.all(workspaceId), 'list'] as const,
  list: (workspaceId: string, filters: ListBookingsQuery) => [...bookingKeys.lists(workspaceId), filters] as const,
  detail: (workspaceId: string, bookingId: string) => [...bookingKeys.all(workspaceId), 'detail', bookingId] as const,
  payments: (workspaceId: string, bookingId: string) => [...bookingKeys.detail(workspaceId, bookingId), 'payments'] as const,
};

function requireWorkspace(id: string | null): string {
  if (!id) throw new Error('No workspace selected');
  return id;
}

function showError(error: unknown, fallback: string) {
  toast.error(extractError(error)?.message ?? (error instanceof Error ? error.message : fallback));
}

export function useBookings(filters: ListBookingsQuery) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: bookingKeys.list(workspaceId ?? '', filters),
    queryFn: ({ signal }) => bookingsApi.list(requireWorkspace(workspaceId), filters, signal),
    enabled: Boolean(workspaceId),
  });
}

export function useBooking(bookingId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: bookingKeys.detail(workspaceId ?? '', bookingId ?? ''),
    queryFn: () => bookingsApi.get(requireWorkspace(workspaceId), bookingId!),
    enabled: Boolean(workspaceId && bookingId),
  });
}

export function usePayments(bookingId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: bookingKeys.payments(workspaceId ?? '', bookingId ?? ''),
    queryFn: ({ signal }) => bookingsApi.payments(requireWorkspace(workspaceId), bookingId!, undefined, signal),
    enabled: Boolean(workspaceId && bookingId),
  });
}

export function useUpdateBooking(bookingId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBookingInput) => bookingsApi.update(requireWorkspace(workspaceId), bookingId, input),
    onSuccess: async (booking) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(bookingKeys.detail(id, bookingId), booking);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id, bookingId) }),
        queryClient.invalidateQueries({ queryKey: bookingKeys.lists(id) }),
      ]);
      toast.success('Booking updated');
    },
    onError: (error) => showError(error, 'Unable to update booking'),
  });
}

export function useCancelBooking(bookingId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CancelBookingInput) => bookingsApi.cancel(requireWorkspace(workspaceId), bookingId, input),
    onSuccess: async (booking) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(bookingKeys.detail(id, bookingId), booking);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id, bookingId) }),
        queryClient.invalidateQueries({ queryKey: bookingKeys.lists(id) }),
      ]);
      toast.success('Booking cancelled');
    },
    onError: (error) => showError(error, 'Unable to cancel booking'),
  });
}

export function useCompleteBooking(bookingId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => bookingsApi.complete(requireWorkspace(workspaceId), bookingId),
    onSuccess: async (booking) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(bookingKeys.detail(id, bookingId), booking);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id, bookingId) }),
        queryClient.invalidateQueries({ queryKey: bookingKeys.lists(id) }),
      ]);
      toast.success('Booking completed');
    },
    onError: (error) => showError(error, 'Unable to complete booking'),
  });
}

export function useRecordPayment(bookingId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => bookingsApi.recordPayment(requireWorkspace(workspaceId), bookingId, input),
    onSuccess: async () => {
      const id = requireWorkspace(workspaceId);
      // The mutate response only carries a booking summary, so re-read the detail
      // (which includes the payment rows and recomputed paid/balance amounts).
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingKeys.detail(id, bookingId) }),
        queryClient.invalidateQueries({ queryKey: bookingKeys.payments(id, bookingId) }),
        queryClient.invalidateQueries({ queryKey: bookingKeys.lists(id) }),
      ]);
      toast.success('Payment recorded');
    },
    onError: (error) => showError(error, 'Unable to record payment'),
  });
}