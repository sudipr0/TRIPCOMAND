import type {
  CreateSupplierInput,
  CreateSupplierRateInput,
  ListSupplierRatesQuery,
  ListSuppliersQuery,
  UpdateSupplierInput,
  UpdateSupplierRateInput,
} from "@trailcomand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { extractError } from "@/lib/api-client";
import { suppliersApi } from "@/features/suppliers/api/suppliers.api";
import { useWorkspaceStore } from "@/stores/workspace.store";

export const supplierKeys = {
  all: (workspaceId: string) => ["suppliers", workspaceId] as const,
  lists: (workspaceId: string) =>
    [...supplierKeys.all(workspaceId), "list"] as const,
  list: (workspaceId: string, filters: ListSuppliersQuery) =>
    [...supplierKeys.lists(workspaceId), filters] as const,
  detail: (workspaceId: string, supplierId: string) =>
    [...supplierKeys.all(workspaceId), "detail", supplierId] as const,
  rates: (
    workspaceId: string,
    supplierId: string,
    params: ListSupplierRatesQuery,
  ) => [...supplierKeys.all(workspaceId), "rates", supplierId, params] as const,
  alternatives: (workspaceId: string, supplierId: string) =>
    [...supplierKeys.all(workspaceId), "alternatives", supplierId] as const,
  activeBookings: (workspaceId: string, supplierId: string) =>
    [...supplierKeys.all(workspaceId), "active-bookings", supplierId] as const,
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

export function useSuppliers(filters: ListSuppliersQuery) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: supplierKeys.list(workspaceId ?? "", filters),
    queryFn: ({ signal }) =>
      suppliersApi.list(requireWorkspace(workspaceId), filters, signal),
    enabled: Boolean(workspaceId),
  });
}

export function useSupplier(supplierId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: supplierKeys.detail(workspaceId ?? "", supplierId ?? ""),
    queryFn: () => suppliersApi.get(requireWorkspace(workspaceId), supplierId!),
    enabled: Boolean(workspaceId && supplierId),
  });
}

export function useCreateSupplier() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupplierInput) =>
      suppliersApi.create(requireWorkspace(workspaceId), input),
    onSuccess: () => {
      toast.success("Supplier added");
      return queryClient.invalidateQueries({
        queryKey: supplierKeys.lists(requireWorkspace(workspaceId)),
      });
    },
    onError: (error) => showError(error, "Could not add the supplier"),
  });
}

export function useUpdateSupplier(supplierId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSupplierInput) =>
      suppliersApi.update(requireWorkspace(workspaceId), supplierId, input),
    onSuccess: () => {
      toast.success("Supplier updated");
      const id = requireWorkspace(workspaceId);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierKeys.lists(id) }),
        queryClient.invalidateQueries({
          queryKey: supplierKeys.detail(id, supplierId),
        }),
      ]);
    },
    onError: (error) => showError(error, "Could not update the supplier"),
  });
}

export function useDeleteSupplier() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (supplierId: string) =>
      suppliersApi.remove(requireWorkspace(workspaceId), supplierId),
    onSuccess: () => {
      toast.success("Supplier deleted");
      return queryClient.invalidateQueries({
        queryKey: supplierKeys.lists(requireWorkspace(workspaceId)),
      });
    },
    onError: (error) => showError(error, "Could not delete the supplier"),
  });
}

export function useRates(supplierId: string, params: ListSupplierRatesQuery) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: supplierKeys.rates(workspaceId ?? "", supplierId, params),
    queryFn: ({ signal }) =>
      suppliersApi.rates(
        requireWorkspace(workspaceId),
        supplierId,
        params,
        signal,
      ),
    enabled: Boolean(workspaceId && supplierId),
  });
}

export function useCreateRate(supplierId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupplierRateInput) =>
      suppliersApi.createRate(requireWorkspace(workspaceId), supplierId, input),
    onSuccess: () => {
      toast.success("Rate added");
      const id = requireWorkspace(workspaceId);
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...supplierKeys.all(id), "rates", supplierId],
        }),
        queryClient.invalidateQueries({
          queryKey: supplierKeys.detail(id, supplierId),
        }),
      ]);
    },
    onError: (error) => showError(error, "Could not add the rate"),
  });
}

export function useUpdateRate(supplierId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rateId,
      input,
    }: {
      rateId: string;
      input: UpdateSupplierRateInput;
    }) =>
      suppliersApi.updateRate(
        requireWorkspace(workspaceId),
        supplierId,
        rateId,
        input,
      ),
    onSuccess: () => {
      toast.success("Rate updated");
      const id = requireWorkspace(workspaceId);
      return queryClient.invalidateQueries({
        queryKey: [...supplierKeys.all(id), "rates", supplierId],
      });
    },
    onError: (error) => showError(error, "Could not update the rate"),
  });
}

export function useDeleteRate(supplierId: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rateId: string) =>
      suppliersApi.deleteRate(
        requireWorkspace(workspaceId),
        supplierId,
        rateId,
      ),
    onSuccess: () => {
      toast.success("Rate deleted");
      return queryClient.invalidateQueries({
        queryKey: [
          ...supplierKeys.all(requireWorkspace(workspaceId)),
          "rates",
          supplierId,
        ],
      });
    },
    onError: (error) => showError(error, "Could not delete the rate"),
  });
}

export function useAlternatives(supplierId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: supplierKeys.alternatives(workspaceId ?? "", supplierId ?? ""),
    queryFn: ({ signal }) =>
      suppliersApi.alternatives(
        requireWorkspace(workspaceId),
        supplierId!,
        {},
        signal,
      ),
    enabled: Boolean(workspaceId && supplierId),
  });
}

export function useActiveSupplierBookings(supplierId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  return useQuery({
    queryKey: supplierKeys.activeBookings(workspaceId ?? "", supplierId ?? ""),
    queryFn: ({ signal }) =>
      suppliersApi.activeBookings(
        requireWorkspace(workspaceId),
        supplierId!,
        signal,
      ),
    enabled: Boolean(workspaceId && supplierId),
  });
}
