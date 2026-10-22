import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateStaffDocumentInput, CreateStaffInput, ListStaffInput, UpdateStaffInput, VerifyStaffDocumentInput } from '@tripchange/shared';
import { toast } from 'sonner';

import { staffApi } from '@/features/staff/api/staff.api';
import { extractError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';

export const staffKeys = {
  all: (workspaceId: string) => ['staff', workspaceId] as const,
  lists: (workspaceId: string) => [...staffKeys.all(workspaceId), 'list'] as const,
  list: (workspaceId: string, filters: ListStaffInput) => [...staffKeys.lists(workspaceId), filters] as const,
  detail: (workspaceId: string, staffId: string) => [...staffKeys.all(workspaceId), 'detail', staffId] as const,
};

function requireWorkspace(workspaceId: string | null): string {
  if (!workspaceId) throw new Error('No workspace selected');
  return workspaceId;
}

function showError(error: unknown, fallback: string) {
  toast.error(extractError(error)?.message ?? (error instanceof Error ? error.message : fallback));
}

export function useStaffList(filters: ListStaffInput) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: staffKeys.list(workspaceId ?? '', filters),
    queryFn: () => staffApi.list(requireWorkspace(workspaceId), filters),
    enabled: Boolean(workspaceId),
  });
}

export function useStaff(staffId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: staffKeys.detail(workspaceId ?? '', staffId ?? ''),
    queryFn: () => staffApi.get(requireWorkspace(workspaceId), staffId!),
    enabled: Boolean(workspaceId && staffId),
  });
}

export function useCreateStaff() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffInput) => staffApi.create(requireWorkspace(workspaceId), input),
    onSuccess: async (staff) => {
      await queryClient.invalidateQueries({ queryKey: staffKeys.lists(requireWorkspace(workspaceId)) });
      queryClient.setQueryData(staffKeys.detail(requireWorkspace(workspaceId), staff.id), staff);
      toast.success('Staff member created');
    },
    onError: (error) => showError(error, 'Unable to create staff member'),
  });
}

export function useUpdateStaff(staffId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStaffInput) => staffApi.update(requireWorkspace(workspaceId), staffId, input),
    onSuccess: async (staff) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(staffKeys.detail(id, staffId), staff);
      await queryClient.invalidateQueries({ queryKey: staffKeys.lists(id) });
      toast.success('Staff member updated');
    },
    onError: (error) => showError(error, 'Unable to update staff member'),
  });
}

export function useDeleteStaff() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (staffId: string) => staffApi.delete(requireWorkspace(workspaceId), staffId),
    onSuccess: async (_, staffId) => {
      const id = requireWorkspace(workspaceId);
      // Keep an active detail page mounted until it redirects; don't refetch a just-deleted record.
      await queryClient.invalidateQueries({ queryKey: staffKeys.detail(id, staffId), refetchType: 'none' });
      await queryClient.invalidateQueries({ queryKey: staffKeys.lists(id) });
      toast.success('Staff member deleted');
    },
    onError: (error) => showError(error, 'Unable to delete staff member'),
  });
}

export function useCreateStaffDocument(staffId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffDocumentInput) => staffApi.createDocument(requireWorkspace(workspaceId), staffId, input),
    onSuccess: async () => {
      const id = requireWorkspace(workspaceId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffKeys.detail(id, staffId) }),
        queryClient.invalidateQueries({ queryKey: staffKeys.lists(id) }),
      ]);
      toast.success('Document added');
    },
    onError: (error) => showError(error, 'Unable to add document'),
  });
}

export function useVerifyStaffDocument(staffId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, input }: { documentId: string; input: VerifyStaffDocumentInput }) =>
      staffApi.verifyDocument(requireWorkspace(workspaceId), documentId, input),
    onSuccess: async (document) => {
      const id = requireWorkspace(workspaceId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffKeys.detail(id, staffId) }),
        queryClient.invalidateQueries({ queryKey: staffKeys.lists(id) }),
      ]);
      toast.success(document.verified ? 'Document verified' : 'Document marked unverified');
    },
    onError: (error) => showError(error, 'Unable to change verification'),
  });
}

export function useDeleteStaffDocument(staffId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => staffApi.deleteDocument(requireWorkspace(workspaceId), documentId),
    onSuccess: async () => {
      const id = requireWorkspace(workspaceId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffKeys.detail(id, staffId) }),
        queryClient.invalidateQueries({ queryKey: staffKeys.lists(id) }),
      ]);
      toast.success('Document deleted');
    },
    onError: (error) => showError(error, 'Unable to delete document'),
  });
}
