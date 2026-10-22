import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { extractError } from '@/lib/api-client';
import { workspaceApi } from '@/features/workspace/api/workspace.api';
import { useWorkspaceStore } from '@/stores/workspace.store';

export function useWorkspaces(enabled = true) {
  const setWorkspaces = useWorkspaceStore((state) => state.setWorkspaces);
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceApi.list,
    enabled,
    select: (workspaces) => {
      setWorkspaces(workspaces);
      return workspaces;
    },
  });
}

export function useCreateWorkspace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);
  return useMutation({
    mutationFn: workspaceApi.create,
    onSuccess: async (workspace) => {
      setCurrentWorkspace(workspace.id);
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      navigate('/dashboard', { replace: true });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useMutation({
    mutationFn: (data: Parameters<typeof workspaceApi.update>[1]) => {
      if (!currentWorkspaceId) return Promise.reject(new Error('No workspace selected'));
      return workspaceApi.update(currentWorkspaceId, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace updated');
    },
    onError: (error) => toast.error(extractError(error)?.message ?? 'Unable to update workspace'),
  });
}

export function useAgencyProfile() {
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: ['agency-profile', currentWorkspaceId],
    queryFn: () => workspaceApi.getAgencyProfile(currentWorkspaceId!),
    enabled: Boolean(currentWorkspaceId),
  });
}

export function useUpdateAgencyProfile() {
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; currency: string; timezone: string }) => {
      if (!currentWorkspaceId) throw new Error('No workspace selected');
      const profile = await workspaceApi.updateAgencyProfile(currentWorkspaceId, { name: data.name });
      return workspaceApi.updateAgencySettings(currentWorkspaceId, {
        currency: data.currency,
        timezone: data.timezone,
      }).then(() => profile);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agency-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
      ]);
      toast.success('Workspace updated');
    },
    onError: (error) => toast.error(extractError(error)?.message ?? 'Unable to update workspace'),
  });
}
