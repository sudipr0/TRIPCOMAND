import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateDestinationInput, ListDestinationsQuery, UpdateDestinationInput } from '@trailcomand/shared';
import { toast } from 'sonner';

import { destinationsApi } from '@/features/destinations/api/destinations.api';
import { extractError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';

export const destinationKeys = {
  all: (workspaceId: string) => ['destinations', workspaceId] as const,
  lists: (workspaceId: string) => [...destinationKeys.all(workspaceId), 'list'] as const,
  list: (workspaceId: string, filters: ListDestinationsQuery) => [...destinationKeys.lists(workspaceId), filters] as const,
  detail: (workspaceId: string, destinationId: string) => [...destinationKeys.all(workspaceId), 'detail', destinationId] as const,
};

function requireWorkspace(workspaceId: string | null): string {
  if (!workspaceId) throw new Error('No workspace selected');
  return workspaceId;
}

function showError(error: unknown, fallback: string) {
  toast.error(extractError(error)?.message ?? (error instanceof Error ? error.message : fallback));
}

export function useDestinationList(filters: ListDestinationsQuery) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: destinationKeys.list(workspaceId ?? '', filters),
    queryFn: () => destinationsApi.list(requireWorkspace(workspaceId), filters),
    enabled: Boolean(workspaceId),
  });
}

export function useDestination(destinationId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: destinationKeys.detail(workspaceId ?? '', destinationId ?? ''),
    queryFn: () => destinationsApi.get(requireWorkspace(workspaceId), destinationId!),
    enabled: Boolean(workspaceId && destinationId),
  });
}

export function useCreateDestination() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDestinationInput) => destinationsApi.create(requireWorkspace(workspaceId), input),
    onSuccess: async (destination) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(destinationKeys.detail(id, destination.id), destination);
      await queryClient.invalidateQueries({ queryKey: destinationKeys.lists(id) });
      toast.success('Destination created');
    },
    onError: (error) => showError(error, 'Unable to create destination'),
  });
}

export function useUpdateDestination(destinationId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDestinationInput) => destinationsApi.update(requireWorkspace(workspaceId), destinationId, input),
    onSuccess: async (destination) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(destinationKeys.detail(id, destinationId), destination);
      await queryClient.invalidateQueries({ queryKey: destinationKeys.lists(id) });
      toast.success('Destination updated');
    },
    onError: (error) => showError(error, 'Unable to update destination'),
  });
}

export function useDeleteDestination() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (destinationId: string) => destinationsApi.delete(requireWorkspace(workspaceId), destinationId),
    onSuccess: async (_, destinationId) => {
      const id = requireWorkspace(workspaceId);
      queryClient.removeQueries({ queryKey: destinationKeys.detail(id, destinationId) });
      await queryClient.invalidateQueries({ queryKey: destinationKeys.lists(id) });
      toast.success('Destination deleted');
    },
    onError: (error) => showError(error, 'Unable to delete destination'),
  });
}
