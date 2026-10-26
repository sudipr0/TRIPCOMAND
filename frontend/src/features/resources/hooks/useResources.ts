import type {
  CreateResourceInput,
  ListResourcesQuery,
  UpdateResourceInput,
} from "@trailcomand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractError } from "@/lib/api-client";
import { resourcesApi } from "@/features/resources/api/resources.api";
import { useWorkspaceStore } from "@/stores/workspace.store";

export const resourceKeys = {
  all: (workspaceId: string) => ["resources", workspaceId] as const,
  lists: (workspaceId: string) =>
    [...resourceKeys.all(workspaceId), "list"] as const,
  list: (workspaceId: string, filters: ListResourcesQuery) =>
    [...resourceKeys.lists(workspaceId), filters] as const,
  detail: (workspaceId: string, resourceId: string) =>
    [...resourceKeys.all(workspaceId), "detail", resourceId] as const,
};

function requireWorkspace(id: string | null): string {
  if (!id) throw new Error("No workspace selected");
  return id;
}

function showError(error: unknown, fallback: string) {
  toast.error(
    extractError(error)?.message ??
      (error instanceof Error ? error.message : fallback),
  );
}

export function useResources(filters: ListResourcesQuery) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: resourceKeys.list(workspaceId ?? "", filters),
    queryFn: ({ signal }) =>
      resourcesApi.list(requireWorkspace(workspaceId), filters, signal),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateResource() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateResourceInput) =>
      resourcesApi.create(requireWorkspace(workspaceId), input),
    onSuccess: () => {
      toast.success("Resource added");
      return queryClient.invalidateQueries({
        queryKey: resourceKeys.lists(requireWorkspace(workspaceId)),
      });
    },
    onError: (error) => showError(error, "Could not add the resource"),
  });
}

export function useUpdateResource(resourceId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateResourceInput) =>
      resourcesApi.update(requireWorkspace(workspaceId), resourceId, input),
    onSuccess: () => {
      toast.success("Resource updated");
      const id = requireWorkspace(workspaceId);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: resourceKeys.lists(id) }),
        queryClient.invalidateQueries({
          queryKey: resourceKeys.detail(id, resourceId),
        }),
      ]);
    },
    onError: (error) => showError(error, "Could not update the resource"),
  });
}

export function useDeleteResource() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: string) =>
      resourcesApi.remove(requireWorkspace(workspaceId), resourceId),
    onSuccess: () => {
      toast.success("Resource deleted");
      return queryClient.invalidateQueries({
        queryKey: resourceKeys.lists(requireWorkspace(workspaceId)),
      });
    },
    onError: (error) => showError(error, "Could not delete the resource"),
  });
}
