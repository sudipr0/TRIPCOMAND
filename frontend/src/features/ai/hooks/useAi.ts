import { useMutation, useQuery } from "@tanstack/react-query";
import type { AICapability } from "@trailcomand/shared";
import {
  aiApi,
  type DraftSupplierEmailInput,
  type DraftTravelerUpdateInput,
} from "@/features/ai/api/ai.api";
import { useWorkspaceStore } from "@/stores/workspace.store";

/**
 * AI Copilot hooks.
 *
 * Drafts are deliberately *not* cached with TanStack Query keys: two requests for
 * the same trip can legitimately produce different drafts, and caching one would
 * make the second click look free when it is not. Each mutation is fired once.
 */

function requireWorkspace(id: string | null): string {
  if (!id) throw new Error("No workspace selected");
  return id;
}

/** Capability probe. Disabled (undefined) when no workspace is selected. */
export function useAiCapability() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: ["ai-capability", workspaceId],
    queryFn: ({ signal }) => aiApi.capability(requireWorkspace(workspaceId), signal),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60_000,
    // One retry only: a transient hiccup should not leave the UI disabled for
    // the whole session, but there is nothing to gain from hammering the probe.
    retry: 1,
  });
}

export function useDraftTravelerUpdate() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useMutation({
    mutationFn: (input: DraftTravelerUpdateInput) =>
      aiApi.draftTravelerUpdate(requireWorkspace(workspaceId), input),
  });
}

export function useDraftSupplierEmail() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useMutation({
    mutationFn: (input: DraftSupplierEmailInput) =>
      aiApi.draftSupplierEmail(requireWorkspace(workspaceId), input),
  });
}

export function useSummarizeTrip() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useMutation({
    mutationFn: (tripId: string) =>
      aiApi.summarizeTrip(requireWorkspace(workspaceId), tripId),
  });
}

export type { AICapability };
