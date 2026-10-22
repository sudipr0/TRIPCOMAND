import type {
  AssignTripInput,
  BulkAddTravelersInput,
  ChangeTripStatusInput,
  CreateItineraryDayInput,
  CreateTripTravelerInput,
  ItineraryDayDetail,
  ItineraryVersionDetail,
  ListTripsQuery,
  ListTripsResult,
  PopulateFromTemplateInput,
  PublishItineraryInput,
  ReadinessSummary,
  ReorderItineraryDaysInput,
  TripDetail,
  TripTravelerDetail,
  UpdateItineraryDayInput,
  UpdateTripInput,
  UpdateTripTravelerInput,
} from "@tripchange/shared";

import { apiClient, unwrap, type ApiEnvelope } from "@/lib/api-client";

const base = (workspaceId: string) => `/api/workspaces/${workspaceId}/trips`;
const trip = (workspaceId: string, tripId: string) =>
  `${base(workspaceId)}/${tripId}`;
const itinerary = (workspaceId: string, tripId: string) =>
  `${trip(workspaceId, tripId)}/itinerary`;

export const tripsApi = {
  list: async (
    workspaceId: string,
    params: ListTripsQuery,
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<ListTripsResult>>(base(workspaceId), {
        params,
        signal,
      }),
    ),

  get: async (workspaceId: string, tripId: string) =>
    unwrap(
      await apiClient.get<ApiEnvelope<TripDetail>>(trip(workspaceId, tripId)),
    ),

  update: async (workspaceId: string, tripId: string, input: UpdateTripInput) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<TripDetail>>(
        trip(workspaceId, tripId),
        input,
      ),
    ),

  updateStatus: async (
    workspaceId: string,
    tripId: string,
    input: ChangeTripStatusInput,
  ) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<TripDetail>>(
        `${trip(workspaceId, tripId)}/status`,
        input,
      ),
    ),

  assign: async (workspaceId: string, tripId: string, input: AssignTripInput) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<TripDetail>>(
        `${trip(workspaceId, tripId)}/assign`,
        input,
      ),
    ),

  remove: async (workspaceId: string, tripId: string) =>
    unwrap(
      await apiClient.delete<ApiEnvelope<{ success: boolean; id: string }>>(
        trip(workspaceId, tripId),
      ),
    ),

  readiness: async (workspaceId: string, tripId: string) =>
    unwrap(
      await apiClient.get<ApiEnvelope<ReadinessSummary>>(
        `${trip(workspaceId, tripId)}/readiness`,
      ),
    ),

  // Travelers
  travelers: async (
    workspaceId: string,
    tripId: string,
    signal?: AbortSignal,
  ) =>
    unwrap(
      await apiClient.get<ApiEnvelope<TripTravelerDetail[]>>(
        `${trip(workspaceId, tripId)}/travelers`,
        { signal },
      ),
    ),

  /** The detail response already carries travelers, so this is only used after a mutation. */
  addTraveler: async (
    workspaceId: string,
    tripId: string,
    input: CreateTripTravelerInput,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<TripTravelerDetail>>(
        `${trip(workspaceId, tripId)}/travelers`,
        input,
      ),
    ),

  bulkAddTravelers: async (
    workspaceId: string,
    tripId: string,
    input: BulkAddTravelersInput,
  ) =>
    unwrap(
      await apiClient.post<
        ApiEnvelope<TripTravelerDetail[] | { items: TripTravelerDetail[] }>
      >(`${trip(workspaceId, tripId)}/travelers/bulk`, input),
    ),

  updateTraveler: async (
    workspaceId: string,
    tripId: string,
    travelerId: string,
    input: UpdateTripTravelerInput,
  ) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<TripTravelerDetail>>(
        `${trip(workspaceId, tripId)}/travelers/${travelerId}`,
        input,
      ),
    ),

  deleteTraveler: async (
    workspaceId: string,
    tripId: string,
    travelerId: string,
  ) =>
    unwrap(
      await apiClient.delete<ApiEnvelope<{ success: boolean; id: string }>>(
        `${trip(workspaceId, tripId)}/travelers/${travelerId}`,
      ),
    ),

  // Itinerary
  days: async (workspaceId: string, tripId: string, signal?: AbortSignal) =>
    unwrap(
      await apiClient.get<ApiEnvelope<ItineraryDayDetail[]>>(
        itinerary(workspaceId, tripId),
        { signal },
      ),
    ),

  createDay: async (
    workspaceId: string,
    tripId: string,
    input: CreateItineraryDayInput,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<ItineraryDayDetail>>(
        itinerary(workspaceId, tripId),
        input,
      ),
    ),

  updateDay: async (
    workspaceId: string,
    tripId: string,
    dayId: string,
    input: UpdateItineraryDayInput,
  ) =>
    unwrap(
      await apiClient.patch<ApiEnvelope<ItineraryDayDetail>>(
        `${itinerary(workspaceId, tripId)}/${dayId}`,
        input,
      ),
    ),

  deleteDay: async (workspaceId: string, tripId: string, dayId: string) =>
    unwrap(
      await apiClient.delete<ApiEnvelope<{ success: boolean; id: string }>>(
        `${itinerary(workspaceId, tripId)}/${dayId}`,
      ),
    ),

  reorderDays: async (
    workspaceId: string,
    tripId: string,
    input: ReorderItineraryDaysInput,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<ItineraryDayDetail[]>>(
        `${itinerary(workspaceId, tripId)}/reorder`,
        input,
      ),
    ),

  populateFromTemplate: async (
    workspaceId: string,
    tripId: string,
    input: PopulateFromTemplateInput,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<ItineraryDayDetail[]>>(
        `${itinerary(workspaceId, tripId)}/from-template`,
        input,
      ),
    ),

  publish: async (
    workspaceId: string,
    tripId: string,
    input: PublishItineraryInput,
  ) =>
    unwrap(
      await apiClient.post<ApiEnvelope<ItineraryVersionDetail>>(
        `${itinerary(workspaceId, tripId)}/publish`,
        input,
      ),
    ),

  versions: async (workspaceId: string, tripId: string, signal?: AbortSignal) =>
    unwrap(
      await apiClient.get<ApiEnvelope<ItineraryVersionDetail[]>>(
        `${itinerary(workspaceId, tripId)}/versions`,
        { signal },
      ),
    ),

  version: async (workspaceId: string, tripId: string, versionId: string) =>
    unwrap(
      await apiClient.get<ApiEnvelope<ItineraryVersionDetail>>(
        `${itinerary(workspaceId, tripId)}/versions/${versionId}`,
      ),
    ),
};
