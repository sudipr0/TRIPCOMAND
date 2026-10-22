import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateInquiryInput, CustomerDetail, InquiryDetail, ListInquiriesQuery, LogInquiryActivityInput, UpdateInquiryInput } from '@tripchange/shared';
import { toast } from 'sonner';

import { customersApi } from '@/features/customers/api/customers.api';
import { customerKeys } from '@/features/customers/hooks/useCustomers';
import { inquiriesApi } from '@/features/inquiries/api/inquiries.api';
import { extractError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';

export const inquiryKeys = {
  all: (workspaceId: string) => ['inquiries', workspaceId] as const,
  lists: (workspaceId: string) => [...inquiryKeys.all(workspaceId), 'list'] as const,
  list: (workspaceId: string, filters: ListInquiriesQuery) => [...inquiryKeys.lists(workspaceId), filters] as const,
  complete: (workspaceId: string, filters: Omit<ListInquiriesQuery, 'limit' | 'offset'>) => [...inquiryKeys.lists(workspaceId), 'complete', filters] as const,
  detail: (workspaceId: string, inquiryId: string) => [...inquiryKeys.all(workspaceId), 'detail', inquiryId] as const,
  activities: (workspaceId: string, inquiryId: string) => [...inquiryKeys.detail(workspaceId, inquiryId), 'activities'] as const,
  members: (workspaceId: string) => ['workspace-members', workspaceId] as const,
  customers: (workspaceId: string) => [...customerKeys.lists(workspaceId), 'complete'] as const,
};

function requireWorkspace(id: string | null): string {
  if (!id) throw new Error('No workspace selected');
  return id;
}

function showError(error: unknown, fallback: string) {
  toast.error(extractError(error)?.message ?? (error instanceof Error ? error.message : fallback));
}

export function useInquiries(filters: ListInquiriesQuery) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: inquiryKeys.list(workspaceId ?? '', filters),
    queryFn: ({ signal }) => inquiriesApi.list(requireWorkspace(workspaceId), filters, signal),
    enabled: Boolean(workspaceId),
  });
}

// Assignment is not an API filter. Fetch every server page before applying it or counting columns.
export function useAllInquiries(filters: Omit<ListInquiriesQuery, 'limit' | 'offset'> = {}) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: inquiryKeys.complete(workspaceId ?? '', filters),
    queryFn: async ({ signal }) => {
      const items: InquiryDetail[] = [];
      let total = 0;
      do {
        const page = await inquiriesApi.list(requireWorkspace(workspaceId), { ...filters, limit: 100, offset: items.length }, signal);
        total = page.total;
        if (!page.items.length && items.length < total) throw new Error('Incomplete inquiry list');
        items.push(...page.items);
      } while (items.length < total);
      return items;
    },
    enabled: Boolean(workspaceId),
  });
}

export function useInquiry(inquiryId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: inquiryKeys.detail(workspaceId ?? '', inquiryId ?? ''),
    queryFn: () => inquiriesApi.get(requireWorkspace(workspaceId), inquiryId!),
    enabled: Boolean(workspaceId && inquiryId),
  });
}

export function useInquiryActivities(inquiryId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: inquiryKeys.activities(workspaceId ?? '', inquiryId),
    queryFn: () => inquiriesApi.activities(requireWorkspace(workspaceId), inquiryId),
    enabled: Boolean(workspaceId && inquiryId),
  });
}

export function useInquiryMembers() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: inquiryKeys.members(workspaceId ?? ''),
    queryFn: () => inquiriesApi.members(requireWorkspace(workspaceId)),
    enabled: Boolean(workspaceId),
  });
}

// The customer selector and pipeline names must include customers beyond the first API page.
export function useAllInquiryCustomers(enabled = true) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: inquiryKeys.customers(workspaceId ?? ''),
    queryFn: async ({ signal }) => {
      const items: CustomerDetail[] = [];
      let total = 0;
      do {
        // The customer hook's list endpoint is workspace-scoped and capped at 100 per request.
        const response = await customersApi.list(requireWorkspace(workspaceId), { limit: 100, offset: items.length });
        if (signal.aborted) throw new Error('Customer request cancelled');
        total = response.total;
        if (!response.items.length && items.length < total) throw new Error('Incomplete customer list');
        items.push(...response.items);
      } while (items.length < total);
      return items;
    },
    enabled: Boolean(workspaceId && enabled),
  });
}

export function useCreateInquiry() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInquiryInput) => inquiriesApi.create(requireWorkspace(workspaceId), input),
    onSuccess: async (inquiry) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(inquiryKeys.detail(id, inquiry.id), inquiry);
      await queryClient.invalidateQueries({ queryKey: inquiryKeys.lists(id) });
      toast.success('Inquiry created');
    },
    onError: (error) => showError(error, 'Unable to create inquiry'),
  });
}

export function useUpdateInquiry(inquiryId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInquiryInput) => inquiriesApi.update(requireWorkspace(workspaceId), inquiryId, input),
    onSuccess: async (inquiry, input) => {
      const id = requireWorkspace(workspaceId);
      // PATCH returns no activities: invalidate the detail so the new timeline event is read back.
      queryClient.setQueryData(inquiryKeys.detail(id, inquiryId), inquiry);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(id, inquiryId) }),
        queryClient.invalidateQueries({ queryKey: inquiryKeys.lists(id) }),
      ]);
      toast.success(input.status === 'WON' ? 'Inquiry marked won' : input.status === 'LOST' ? 'Inquiry marked lost'
        : input.assignedToId !== undefined ? input.assignedToId ? 'Inquiry assigned' : 'Inquiry unassigned' : 'Inquiry updated');
    },
    onError: (error) => showError(error, 'Unable to update inquiry'),
  });
}

export function useConvertInquiry(inquiryId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => inquiriesApi.convert(requireWorkspace(workspaceId), inquiryId),
    onSuccess: async () => {
      const id = requireWorkspace(workspaceId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(id, inquiryId) }),
        queryClient.invalidateQueries({ queryKey: inquiryKeys.lists(id) }),
      ]);
      toast.success('Inquiry marked QUOTED. Create a quotation separately.');
    },
    onError: (error) => showError(error, 'Unable to convert inquiry'),
  });
}

export function useLogInquiryActivity(inquiryId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogInquiryActivityInput) => inquiriesApi.logActivity(requireWorkspace(workspaceId), inquiryId, input),
    onSuccess: async () => {
      const id = requireWorkspace(workspaceId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inquiryKeys.activities(id, inquiryId) }),
        queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(id, inquiryId) }),
      ]);
      toast.success('Activity logged');
    },
    onError: (error) => showError(error, 'Unable to log activity'),
  });
}

export function useDeleteInquiry() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inquiryId: string) => inquiriesApi.delete(requireWorkspace(workspaceId), inquiryId),
    onSuccess: async (_, inquiryId) => {
      const id = requireWorkspace(workspaceId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inquiryKeys.detail(id, inquiryId), refetchType: 'none' }),
        queryClient.invalidateQueries({ queryKey: inquiryKeys.lists(id) }),
      ]);
      toast.success('Inquiry deleted');
    },
    onError: (error) => showError(error, 'Unable to delete inquiry'),
  });
}
