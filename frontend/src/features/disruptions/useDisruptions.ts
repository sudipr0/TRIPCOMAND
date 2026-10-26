import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CompleteRecoveryTaskInput, CreateDisruptionInput, CreateRecoveryPlanInput } from '@trailcomand/shared';

import { extractError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { disruptionsApi } from '@/features/disruptions/disruption.api';

export const disruptionKeys = {
  all: (workspaceId: string) => ['disruptions', workspaceId] as const,
  list: (workspaceId: string, tripId?: string) => [...disruptionKeys.all(workspaceId), 'list', tripId ?? 'all'] as const,
  detail: (workspaceId: string, id: string) => [...disruptionKeys.all(workspaceId), 'detail', id] as const,
};

function requireWorkspace(workspaceId: string | null) {
  if (!workspaceId) throw new Error('No workspace selected');
  return workspaceId;
}

function showError(error: unknown, fallback: string) {
  toast.error(extractError(error)?.message ?? (error instanceof Error ? error.message : fallback));
}

export function useDisruptions(tripId?: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: disruptionKeys.list(workspaceId ?? '', tripId),
    queryFn: ({ signal }) => disruptionsApi.list(requireWorkspace(workspaceId), tripId, signal),
    enabled: Boolean(workspaceId),
  });
}

export function useDisruption(disruptionId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: disruptionKeys.detail(workspaceId ?? '', disruptionId ?? ''),
    queryFn: () => disruptionsApi.get(requireWorkspace(workspaceId), disruptionId!),
    enabled: Boolean(workspaceId && disruptionId),
  });
}

export function useCreateDisruption() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDisruptionInput) => disruptionsApi.create(requireWorkspace(workspaceId), input),
    onSuccess: async (disruption) => {
      const id = requireWorkspace(workspaceId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: disruptionKeys.all(id) }),
        queryClient.invalidateQueries({ queryKey: ['trips', id] }),
      ]);
      queryClient.setQueryData(disruptionKeys.detail(id, disruption.id), disruption);
      toast.success('Disruption reported');
    },
    onError: (error) => showError(error, 'Could not report disruption'),
  });
}

export function useCreateRecoveryPlan(disruptionId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecoveryPlanInput) => disruptionsApi.createPlan(requireWorkspace(workspaceId), disruptionId, input),
    onSuccess: async (disruption) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(disruptionKeys.detail(id, disruptionId), disruption);
      await queryClient.invalidateQueries({ queryKey: disruptionKeys.all(id) });
      toast.success('Recovery plan created');
    },
    onError: (error) => showError(error, 'Could not create recovery plan'),
  });
}

export function useApproveRecoveryPlan(disruptionId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disruptionsApi.approvePlan(requireWorkspace(workspaceId), disruptionId),
    onSuccess: (disruption) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(disruptionKeys.detail(id, disruptionId), disruption);
      void queryClient.invalidateQueries({ queryKey: disruptionKeys.all(id) });
      toast.success('Recovery plan approved');
    },
    onError: (error) => showError(error, 'Could not approve recovery plan'),
  });
}

export function useCompleteRecoveryTask(disruptionId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: CompleteRecoveryTaskInput }) =>
      disruptionsApi.completeTask(requireWorkspace(workspaceId), taskId, input),
    onSuccess: (disruption) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(disruptionKeys.detail(id, disruptionId), disruption);
      void queryClient.invalidateQueries({ queryKey: disruptionKeys.all(id) });
      toast.success(disruption.status === 'RESOLVED' ? 'Disruption resolved' : 'Task completed');
    },
    onError: (error) => showError(error, 'Could not complete task'),
  });
}
