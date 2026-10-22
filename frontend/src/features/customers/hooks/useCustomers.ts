import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from '@tripchange/shared';
import { toast } from 'sonner';

import { customersApi } from '@/features/customers/api/customers.api';
import { extractError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';

export const customerKeys = {
  all: (workspaceId: string) => ['customers', workspaceId] as const,
  lists: (workspaceId: string) => [...customerKeys.all(workspaceId), 'list'] as const,
  list: (workspaceId: string, filters: ListCustomersQuery) => [...customerKeys.lists(workspaceId), filters] as const,
  detail: (workspaceId: string, customerId: string) => [...customerKeys.all(workspaceId), 'detail', customerId] as const,
};

function requireWorkspace(workspaceId: string | null): string {
  if (!workspaceId) throw new Error('No workspace selected');
  return workspaceId;
}

function showError(error: unknown, fallback: string) {
  toast.error(extractError(error)?.message ?? (error instanceof Error ? error.message : fallback));
}

export function useCustomerList(filters: ListCustomersQuery) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: customerKeys.list(workspaceId ?? '', filters),
    queryFn: () => customersApi.list(requireWorkspace(workspaceId), filters),
    enabled: Boolean(workspaceId),
  });
}

export function useCustomer(customerId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: customerKeys.detail(workspaceId ?? '', customerId ?? ''),
    queryFn: () => customersApi.get(requireWorkspace(workspaceId), customerId!),
    enabled: Boolean(workspaceId && customerId),
  });
}

export function useCreateCustomer() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => customersApi.create(requireWorkspace(workspaceId), input),
    onSuccess: async (customer) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(customerKeys.detail(id, customer.id), customer);
      await queryClient.invalidateQueries({ queryKey: customerKeys.lists(id) });
      toast.success('Customer created');
    },
    onError: (error) => showError(error, 'Unable to create customer'),
  });
}

export function useUpdateCustomer(customerId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCustomerInput) => customersApi.update(requireWorkspace(workspaceId), customerId, input),
    onSuccess: async (customer) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(customerKeys.detail(id, customerId), customer);
      await queryClient.invalidateQueries({ queryKey: customerKeys.lists(id) });
      toast.success('Customer updated');
    },
    onError: (error) => showError(error, 'Unable to update customer'),
  });
}

export function useDeleteCustomer() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => customersApi.delete(requireWorkspace(workspaceId), customerId),
    onSuccess: async (_, customerId) => {
      const id = requireWorkspace(workspaceId);
      await Promise.all([
        // Keep an active detail on screen until its caller navigates away.
        queryClient.invalidateQueries({ queryKey: customerKeys.detail(id, customerId), refetchType: 'none' }),
        queryClient.invalidateQueries({ queryKey: customerKeys.lists(id), refetchType: 'active' }),
      ]);
      toast.success('Customer deleted');
    },
    onError: (error) => showError(error, 'Unable to delete customer'),
  });
}
