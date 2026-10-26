import type {
  PortalAccessLink,
  PortalCommandCenter,
  PortalHelpRequestInput,
  PortalHelpRequestResult,
  PortalHelpRequestSummary,
  PortalUpdateAcknowledgement,
  PortalTravelerDocuments,
  TripDocumentDetail,
} from '@trailcomand/shared';
import type { CreateTripDocumentInput } from '@trailcomand/shared';

import { apiClient, unwrap, type ApiEnvelope } from '@/lib/api-client';

const portalBase = (token: string) => `/api/v1/portal/${encodeURIComponent(token)}`;
const workspaceTrips = (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/trips`;

export const portalApi = {
  /** Public — the token is the only credential. */
  view: async (token: string, signal?: AbortSignal) =>
    unwrap(await apiClient.get<ApiEnvelope<PortalCommandCenter>>(portalBase(token), { signal })),

  /** Confirm an update has been read. Safe to retry: the server is idempotent. */
  acknowledge: async (token: string, updateId: string, clientId: string) =>
    unwrap(
      await apiClient.post<ApiEnvelope<PortalUpdateAcknowledgement>>(
        `${portalBase(token)}/acknowledge/${encodeURIComponent(updateId)}`,
        { clientId },
      ),
    ),

  /** Ask the agency for help. Deduplicated server-side on clientId. */
  helpRequest: async (token: string, input: PortalHelpRequestInput) =>
    unwrap(
      await apiClient.post<ApiEnvelope<PortalHelpRequestResult>>(
        `${portalBase(token)}/help-request`,
        input,
      ),
    ),

  uploadDocument: async (
    token: string,
    input: Omit<CreateTripDocumentInput, 'travelerId'>,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<TripDocumentDetail>>(
        `${portalBase(token)}/documents`,
        input,
      ),
    ),
};

export const portalAdminApi = {
  /** Issue or rotate a traveler's magic link. */
  issueLink: async (workspaceId: string, tripId: string, travelerId: string) =>
    unwrap(
      await apiClient.post<ApiEnvelope<PortalAccessLink>>(
        `${workspaceTrips(workspaceId)}/${tripId}/travelers/${travelerId}/portal-access`,
      ),
    ),

  documents: async (workspaceId: string, tripId: string, signal?: AbortSignal) =>
    unwrap(
      await apiClient.get<ApiEnvelope<PortalTravelerDocuments[]>>(
        `${workspaceTrips(workspaceId)}/${tripId}/documents`,
        { signal },
      ),
    ),

  uploadDocument: async (
    workspaceId: string,
    tripId: string,
    input: CreateTripDocumentInput,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<TripDocumentDetail>>(
        `${workspaceTrips(workspaceId)}/${tripId}/documents`,
        input,
      ),
    ),

  /** Traveller help requests filed against this trip (they are inquiries underneath). */
  helpRequests: async (workspaceId: string, tripId: string, signal?: AbortSignal) =>
    unwrap(
      await apiClient.get<ApiEnvelope<PortalHelpRequestSummary[]>>(
        `${workspaceTrips(workspaceId)}/${tripId}/portal-help-requests`,
        { signal },
      ),
    ),
};
