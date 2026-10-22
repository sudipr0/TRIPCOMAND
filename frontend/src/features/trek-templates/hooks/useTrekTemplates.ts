import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
   CreateTrekTemplateDayInput, CreateTrekTemplateInput, ListTrekTemplatesQuery, ReorderTrekTemplateDaysInput,
  UpdateTrekTemplateDayInput, UpdateTrekTemplateInput,
} from '@tripchange/shared';
import { toast } from 'sonner';

import { trekTemplatesApi } from '@/features/trek-templates/api/trekTemplates.api';
import { extractError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/workspace.store';

export const trekTemplateKeys = {
  all: (workspaceId: string) => ['trek-templates', workspaceId] as const,
  lists: (workspaceId: string) => [...trekTemplateKeys.all(workspaceId), 'list'] as const,
  list: (workspaceId: string, filters: ListTrekTemplatesQuery) => [...trekTemplateKeys.lists(workspaceId), filters] as const,
  detail: (workspaceId: string, templateId: string) => [...trekTemplateKeys.all(workspaceId), 'detail', templateId] as const,
  days: (workspaceId: string, templateId: string) => [...trekTemplateKeys.detail(workspaceId, templateId), 'days'] as const,
};

function requireWorkspace(workspaceId: string | null): string {
  if (!workspaceId) throw new Error('No workspace selected');
  return workspaceId;
}

function showError(error: unknown, fallback: string) {
  toast.error(extractError(error)?.message ?? (error instanceof Error ? error.message : fallback));
}

export function useTrekTemplateList(filters: ListTrekTemplatesQuery) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: trekTemplateKeys.list(workspaceId ?? '', filters),
    queryFn: () => trekTemplatesApi.list(requireWorkspace(workspaceId), filters),
    enabled: Boolean(workspaceId),
  });
}

export function useTrekTemplate(templateId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: trekTemplateKeys.detail(workspaceId ?? '', templateId ?? ''),
    queryFn: () => trekTemplatesApi.get(requireWorkspace(workspaceId), templateId!),
    enabled: Boolean(workspaceId && templateId),
  });
}

export function useTrekTemplateDays(templateId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: trekTemplateKeys.days(workspaceId ?? '', templateId),
    queryFn: () => trekTemplatesApi.listDays(requireWorkspace(workspaceId), templateId),
    enabled: Boolean(workspaceId && templateId),
  });
}

export function useCreateTrekTemplate() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTrekTemplateInput) => trekTemplatesApi.create(requireWorkspace(workspaceId), input),
    onSuccess: async (template) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(trekTemplateKeys.detail(id, template.id), template);
      await queryClient.invalidateQueries({ queryKey: trekTemplateKeys.lists(id) });
      toast.success('Trek template created');
    },
    onError: (error) => showError(error, 'Unable to create trek template'),
  });
}

export function useUpdateTrekTemplate(templateId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTrekTemplateInput) => trekTemplatesApi.update(requireWorkspace(workspaceId), templateId, input),
    onSuccess: async (template) => {
      const id = requireWorkspace(workspaceId);
      queryClient.setQueryData(trekTemplateKeys.detail(id, templateId), template);
      await queryClient.invalidateQueries({ queryKey: trekTemplateKeys.lists(id) });
      toast.success('Trek template updated');
    },
    onError: (error) => showError(error, 'Unable to update trek template'),
  });
}

export function useDeleteTrekTemplate() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => trekTemplatesApi.delete(requireWorkspace(workspaceId), templateId),
    onSuccess: async (_, templateId) => {
      const id = requireWorkspace(workspaceId);
      // Avoid a 404 refetch on the still-mounted detail page before its redirect completes.
      await queryClient.invalidateQueries({ queryKey: trekTemplateKeys.detail(id, templateId), refetchType: 'none' });
      await queryClient.invalidateQueries({ queryKey: trekTemplateKeys.lists(id) });
      toast.success('Trek template deleted');
    },
    onError: (error) => showError(error, 'Unable to delete trek template'),
  });
}

function useInvalidateDays() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return async (templateId: string) => {
    const id = requireWorkspace(workspaceId);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trekTemplateKeys.detail(id, templateId) }),
      queryClient.invalidateQueries({ queryKey: trekTemplateKeys.lists(id) }),
    ]);
  };
}

export function useAddTrekTemplateDay(templateId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const invalidate = useInvalidateDays();
  return useMutation({
    mutationFn: (input: CreateTrekTemplateDayInput) => trekTemplatesApi.addDay(requireWorkspace(workspaceId), templateId, input),
    onSuccess: async () => { await invalidate(templateId); toast.success('Day added'); },
    onError: (error) => showError(error, 'Unable to add day'),
  });
}

export function useUpdateTrekTemplateDay(templateId: string, dayId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const invalidate = useInvalidateDays();
  return useMutation({
    mutationFn: (input: UpdateTrekTemplateDayInput) => trekTemplatesApi.updateDay(requireWorkspace(workspaceId), templateId, dayId, input),
    onSuccess: async () => { await invalidate(templateId); toast.success('Day updated'); },
    onError: (error) => showError(error, 'Unable to update day'),
  });
}

export function useDeleteTrekTemplateDay(templateId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const invalidate = useInvalidateDays();
  return useMutation({
    mutationFn: (dayId: string) => trekTemplatesApi.deleteDay(requireWorkspace(workspaceId), templateId, dayId),
    onSuccess: async () => { await invalidate(templateId); toast.success('Day deleted'); },
    onError: (error) => showError(error, 'Unable to delete day'),
  });
}

export function useReorderTrekTemplateDays(templateId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const invalidate = useInvalidateDays();
  return useMutation({
    mutationFn: (input: ReorderTrekTemplateDaysInput) => trekTemplatesApi.reorderDays(requireWorkspace(workspaceId), templateId, input),
    onSuccess: async () => { await invalidate(templateId); toast.success('Days reordered'); },
    onError: (error) => showError(error, 'Unable to reorder days'),
  });
}
