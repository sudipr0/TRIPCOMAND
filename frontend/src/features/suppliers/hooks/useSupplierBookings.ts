import type {
  ConfirmSupplierBookingInput,
  CreateSupplierBookingInput,
  RecordSupplierBookingActualCostInput,
  RecordSupplierQuoteInput,
  UpdateSupplierBookingInput,
} from "@tripchange/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { extractError } from "@/lib/api-client";
import { supplierBookingsApi } from "@/features/suppliers/api/supplierBookings.api";
import { useWorkspaceStore } from "@/stores/workspace.store";

export const supplierBookingKeys = {
  all: (workspaceId: string) => ["supplier-bookings", workspaceId] as const,
  byTrip: (workspaceId: string, tripId: string) =>
    [...supplierBookingKeys.all(workspaceId), "trip", tripId] as const,
  bySupplier: (workspaceId: string, supplierId: string) =>
    [...supplierBookingKeys.all(workspaceId), "supplier", supplierId] as const,
  deadlines: (workspaceId: string, withinHours: number) =>
    [
      ...supplierBookingKeys.all(workspaceId),
      "deadlines",
      withinHours,
    ] as const,
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

/** Any booking change moves deadlines and costs, so every mutation refreshes the whole set. */
function invalidateAll(queryClient: QueryClient, workspaceId: string) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: [...supplierBookingKeys.all(workspaceId), "trip"],
    }),
    queryClient.invalidateQueries({
      queryKey: [...supplierBookingKeys.all(workspaceId), "supplier"],
    }),
    queryClient.invalidateQueries({
      queryKey: [...supplierBookingKeys.all(workspaceId), "deadlines"],
    }),
    // Supplier detail shows active-booking counts and recent activity.
    queryClient.invalidateQueries({ queryKey: ["suppliers", workspaceId] }),
    // Trip readiness can depend on confirmed supplier services.
    queryClient.invalidateQueries({ queryKey: ["trips", workspaceId] }),
  ]);
}

export function useSupplierBookings(tripId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: supplierBookingKeys.byTrip(workspaceId ?? "", tripId),
    queryFn: ({ signal }) =>
      supplierBookingsApi.listByTrip(
        requireWorkspace(workspaceId),
        tripId,
        signal,
      ),
    enabled: Boolean(workspaceId && tripId),
  });
}

export function useSupplierBookingsList(supplierId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: supplierBookingKeys.bySupplier(
      workspaceId ?? "",
      supplierId ?? "",
    ),
    queryFn: ({ signal }) =>
      supplierBookingsApi.listBySupplier(
        requireWorkspace(workspaceId),
        supplierId!,
        signal,
      ),
    enabled: Boolean(workspaceId && supplierId),
  });
}

export function useSupplierDeadlines(withinHours = 168) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: supplierBookingKeys.deadlines(workspaceId ?? "", withinHours),
    queryFn: ({ signal }) =>
      supplierBookingsApi.deadlines(
        requireWorkspace(workspaceId),
        withinHours,
        signal,
      ),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateSupplierBooking() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupplierBookingInput) =>
      supplierBookingsApi.create(requireWorkspace(workspaceId), input),
    onSuccess: () => {
      toast.success("Supplier booked");
      return invalidateAll(queryClient, requireWorkspace(workspaceId));
    },
    onError: (error) =>
      showError(error, "Could not create the supplier booking"),
  });
}

export function useUpdateSupplierBooking() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      input,
    }: {
      bookingId: string;
      input: UpdateSupplierBookingInput;
    }) =>
      supplierBookingsApi.update(
        requireWorkspace(workspaceId),
        bookingId,
        input,
      ),
    onSuccess: () => {
      toast.success("Booking updated");
      return invalidateAll(queryClient, requireWorkspace(workspaceId));
    },
    onError: (error) => showError(error, "Could not update the booking"),
  });
}

export function useDeleteSupplierBooking() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      supplierBookingsApi.remove(requireWorkspace(workspaceId), bookingId),
    onSuccess: () => {
      toast.success("Booking deleted");
      return invalidateAll(queryClient, requireWorkspace(workspaceId));
    },
    onError: (error) => showError(error, "Could not delete the booking"),
  });
}

/** Each transition reports its own success message so the resulting state is explicit. */
function useTransition<TInput>(
  action: (
    workspaceId: string,
    bookingId: string,
    input: TInput,
  ) => Promise<{ status: string }>,
  message: string,
  inputOf: (arg: TInput) => TInput = (arg) => arg,
) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, input }: { bookingId: string; input?: TInput }) =>
      action(
        requireWorkspace(workspaceId),
        bookingId,
        inputOf((input ?? {}) as TInput),
      ),
    onSuccess: () => {
      toast.success(message);
      return invalidateAll(queryClient, requireWorkspace(workspaceId));
    },
    onError: (error) => showError(error, "Could not update the booking"),
  });
}

export function useRequestSupplierQuote() {
  return useTransition<Record<string, never>>(
    (wid, id) => supplierBookingsApi.requestQuote(wid, id),
    "Quote requested",
  );
}

export function useRecordSupplierQuote() {
  return useTransition<RecordSupplierQuoteInput>(
    (wid, id, input) => supplierBookingsApi.recordQuote(wid, id, input),
    "Quote recorded",
  );
}

export function useConfirmSupplierBooking() {
  return useTransition<ConfirmSupplierBookingInput>(
    (wid, id, input) => supplierBookingsApi.confirm(wid, id, input),
    "Booking confirmed",
  );
}

export function useMarkSupplierInProgress() {
  return useTransition<Record<string, never>>(
    (wid, id) => supplierBookingsApi.markInProgress(wid, id),
    "Booking in progress",
  );
}

export function useCompleteSupplierBooking() {
  return useTransition<Record<string, never>>(
    (wid, id) => supplierBookingsApi.complete(wid, id),
    "Booking completed",
  );
}

export function useCancelSupplierBooking() {
  return useTransition<{ reason: string }>(
    (wid, id, input) => supplierBookingsApi.cancel(wid, id, input),
    "Booking cancelled",
  );
}

export function useMarkSupplierNoShow() {
  return useTransition<Record<string, never>>(
    (wid, id) => supplierBookingsApi.noShow(wid, id),
    "Booking marked as no-show",
  );
}

export function useRecordSupplierActualCost() {
  return useTransition<RecordSupplierBookingActualCostInput>(
    (wid, id, input) => supplierBookingsApi.recordActualCost(wid, id, input),
    "Actual cost recorded",
  );
}
