import { toast } from 'sonner';
import type { CreateQuotationInput } from '@tripchange/shared';
import type { UpdateQuotationInput } from '@tripchange/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListQuotationsQuery, QuotationDetail } from '@tripchange/shared';

import { extractError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { bookingKeys } from '@/features/bookings/hooks/useBookings';
import { inquiryKeys } from '@/features/inquiries/hooks/useInquiries';
import { quotationsApi } from '@/features/quotations/api/quotations.api';

export const quotationKeys = {
  all: (workspaceId: string) => ['quotations', workspaceId] as const,
  lists: (workspaceId: string) => [...quotationKeys.all(workspaceId), 'list'] as const,
  list: (workspaceId: string, filters: ListQuotationsQuery) => [...quotationKeys.lists(workspaceId), filters] as const,
  detail: (workspaceId: string, quotationId: string) => [...quotationKeys.all(workspaceId), 'detail', quotationId] as const,
};

function requireWorkspace(id: string | null): string {
  if (!id) throw new Error('No workspace selected');
  return id;
}

function showError(error: unknown, fallback: string) {
  toast.error(extractError(error)?.message ?? (error instanceof Error ? error.message : fallback));
}

export function useQuotations(filters: ListQuotationsQuery) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: quotationKeys.list(workspaceId ?? '', filters),
    queryFn: ({ signal }) => quotationsApi.list(requireWorkspace(workspaceId), filters, signal),
    enabled: Boolean(workspaceId),
  });
}

export function useQuotation(quotationId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: quotationKeys.detail(workspaceId ?? '', quotationId ?? ''),
    queryFn: () => quotationsApi.get(requireWorkspace(workspaceId), quotationId!),
    enabled: Boolean(workspaceId && quotationId),
  });
}

export function useCreateQuotation() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuotationInput) => quotationsApi.create(requireWorkspace(workspaceId), input),
    onSuccess: async (quotation, input) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(quotationKeys.detail(id, quotation.id), quotation);
      const tasks = [queryClient.invalidateQueries({ queryKey: quotationKeys.lists(id) })];
      if (input.inquiryId) {
        // Backend create does not change inquiry status; mirror the intended pipeline move.
        await quotationsApi.markInquiryQuoted(id, input.inquiryId).catch(() => undefined);
        tasks.push(
          queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(id, input.inquiryId) }),
          queryClient.invalidateQueries({ queryKey: inquiryKeys.lists(id) }),
        );
      }
      await Promise.all(tasks);
      toast.success('Quotation created');
    },
    onError: (error) => showError(error, 'Unable to create quotation'),
  });
}

export function useUpdateQuotation(quotationId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateQuotationInput) => quotationsApi.update(requireWorkspace(workspaceId), quotationId, input),
    onSuccess: async (quotation) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(quotationKeys.detail(id, quotationId), quotation);
      // The detail response is authoritative but PATCH also bumps version; re-read to be safe.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id, quotationId) }),
        queryClient.invalidateQueries({ queryKey: quotationKeys.lists(id) }),
      ]);
      toast.success('Quotation updated');
    },
    onError: (error) => showError(error, 'Unable to update quotation'),
  });
}

export function useDeleteQuotation() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (quotationId: string) => quotationsApi.delete(requireWorkspace(workspaceId), quotationId),
    onSuccess: async (_, quotationId) => {
      const id = requireWorkspace(workspaceId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id, quotationId), refetchType: 'none' }),
        queryClient.invalidateQueries({ queryKey: quotationKeys.lists(id) }),
      ]);
      toast.success('Quotation deleted');
    },
    onError: (error) => showError(error, 'Unable to delete quotation'),
  });
}

function useQuotationTransition(
  quotationId: string,
  run: (workspaceId: string) => Promise<QuotationDetail>,
  messages: { success: string; failure: string },
) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => run(requireWorkspace(workspaceId)),
    onSuccess: async (quotation) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(quotationKeys.detail(id, quotationId), quotation);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id, quotationId) }),
        queryClient.invalidateQueries({ queryKey: quotationKeys.lists(id) }),
      ]);
      toast.success(messages.success);
    },
    onError: (error) => showError(error, messages.failure),
  });
}

export function useSendQuotation(quotationId: string) {
  return useQuotationTransition(
    quotationId,
    (workspaceId) => quotationsApi.send(workspaceId, quotationId),
    { success: 'Quotation sent', failure: 'Unable to send quotation' },
  );
}

export function useAcceptQuotation(quotationId: string) {
  return useQuotationTransition(
    quotationId,
    (workspaceId) => quotationsApi.accept(workspaceId, quotationId),
    { success: 'Quotation accepted', failure: 'Unable to accept quotation' },
  );
}

export function useRejectQuotation(quotationId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => quotationsApi.reject(requireWorkspace(workspaceId), quotationId, reason),
    onSuccess: async (quotation) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(quotationKeys.detail(id, quotationId), quotation);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id, quotationId) }),
        queryClient.invalidateQueries({ queryKey: quotationKeys.lists(id) }),
      ]);
      toast.success('Quotation rejected');
    },
    onError: (error) => showError(error, 'Unable to reject quotation'),
  });
}

/**
 * Convert an accepted quotation. Invalidates the quotation, the quotation list, the bookings list,
 * and the inquiry (the backend marks it WON during conversion).
 */
export function useConvertQuotation(quotationId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => quotationsApi.convert(requireWorkspace(workspaceId), quotationId),
    onSuccess: async (result) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(quotationKeys.detail(id, quotationId), result.quotation);
      const tasks = [
        queryClient.invalidateQueries({ queryKey: quotationKeys.detail(id, quotationId) }),
        queryClient.invalidateQueries({ queryKey: quotationKeys.lists(id) }),
        queryClient.invalidateQueries({ queryKey: bookingKeys.lists(id) }),
      ];
      if (result.quotation.inquiryId) {
        tasks.push(
          queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(id, result.quotation.inquiryId) }),
          queryClient.invalidateQueries({ queryKey: inquiryKeys.lists(id) }),
        );
      }
      await Promise.all(tasks);
      toast.success('Booking created');
    },
    onError: (error) => showError(error, 'Unable to convert quotation'),
  });
}
