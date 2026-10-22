import type {
  CreateCustomerInput, CustomerDetail, ListCustomersQuery, ListCustomersResult, UpdateCustomerInput,
} from '@tripchange/shared';

import { apiClient, unwrap, type ApiEnvelope } from '@/lib/api-client';

const base = (workspaceId: string) => `/api/workspaces/${workspaceId}/customers`;

export const customersApi = {
  list: async (workspaceId: string, params: ListCustomersQuery) =>
    unwrap(await apiClient.get<ApiEnvelope<ListCustomersResult>>(base(workspaceId), { params })),
  get: async (workspaceId: string, customerId: string) =>
    unwrap(await apiClient.get<ApiEnvelope<CustomerDetail>>(`${base(workspaceId)}/${customerId}`)),
  create: async (workspaceId: string, input: CreateCustomerInput) =>
    unwrap(await apiClient.post<ApiEnvelope<CustomerDetail>>(base(workspaceId), input)),
  update: async (workspaceId: string, customerId: string, input: UpdateCustomerInput) =>
    unwrap(await apiClient.patch<ApiEnvelope<CustomerDetail>>(`${base(workspaceId)}/${customerId}`, input)),
  delete: async (workspaceId: string, customerId: string) =>
    unwrap(await apiClient.delete<ApiEnvelope<{ success: true; id: string }>>(`${base(workspaceId)}/${customerId}`)),
};
