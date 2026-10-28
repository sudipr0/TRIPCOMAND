import type {
  AICapability,
  AIDraft,
  AITravelerTone,
} from "@trailcomand/shared";
import { apiClient, unwrap, type ApiEnvelope } from "@/lib/api-client";

/**
 * Client for the AI Operations Copilot.
 *
 * These calls *draft text only*. Nothing here sends a message, books anything,
 * or mutates data — the UI makes that boundary visible to the user too.
 */
const base = (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/ai`;

export interface DraftTravelerUpdateInput {
  tripId: string;
  disruptionId: string;
  tone: AITravelerTone;
}

export interface DraftSupplierEmailInput {
  tripId: string;
  supplierId: string;
  /** Optional staff note about what to ask. Bounded server-side to 1000 chars. */
  messageContext?: string;
}

export const aiApi = {
  /** Cheap probe so the UI can disable AI actions instead of firing failing calls. */
  capability: async (workspaceId: string, signal?: AbortSignal) =>
    unwrap(
      await apiClient.get<ApiEnvelope<AICapability>>(`${base(workspaceId)}/capability`, {
        signal,
      }),
    ),

  draftTravelerUpdate: async (
    workspaceId: string,
    input: DraftTravelerUpdateInput,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<AIDraft>>(
        `${base(workspaceId)}/draft-traveler-update`,
        input,
      ),
    ),

  draftSupplierEmail: async (
    workspaceId: string,
    input: DraftSupplierEmailInput,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<AIDraft>>(
        `${base(workspaceId)}/draft-supplier-email`,
        input,
      ),
    ),

  summarizeTrip: async (workspaceId: string, tripId: string) =>
    unwrap(
      await apiClient.post<ApiEnvelope<AIDraft>>(
        `${base(workspaceId)}/summarize-trip`,
        { tripId },
      ),
    ),
};
