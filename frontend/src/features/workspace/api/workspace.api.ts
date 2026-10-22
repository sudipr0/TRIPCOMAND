import type { AgencyProfileDetail, CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceSummary } from '@tripchange/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const workspaceApi = {
  list: async () => unwrap(await apiClient.get<{ success: true; data: WorkspaceSummary[] }>('/api/workspaces')),
  create: async (input: CreateWorkspaceInput & { currency?: string; timezone?: string }) => {
    const created = unwrap(await apiClient.post<{ success: true; data: WorkspaceSummary }>('/api/workspaces', {
      name: input.name,
      slug: input.slug,
    }));
    if (input.currency || input.timezone) {
      await apiClient.patch(`/api/workspaces/${created.id}`, {
        settings: {
          ...(input.currency ? { currency: input.currency } : {}),
          ...(input.timezone ? { timezone: input.timezone } : {}),
        },
      }, { headers: { 'X-Workspace-Id': created.id } });
    }
    return created;
  },
  get: async (id: string) => unwrap(await apiClient.get<{ success: true; data: unknown }>(`/api/workspaces/${id}`, { headers: { 'X-Workspace-Id': id } })),
  update: async (id: string, data: UpdateWorkspaceInput) =>
    unwrap(await apiClient.patch<{ success: true; data: WorkspaceSummary }>(`/api/workspaces/${id}`, data, { headers: { 'X-Workspace-Id': id } })),
  getAgencyProfile: async (id: string) =>
    unwrap(await apiClient.get<{ success: true; data: AgencyProfileDetail }>(`/api/workspaces/${id}/agency/profile`, { headers: { 'X-Workspace-Id': id } })),
  updateAgencyProfile: async (id: string, data: { name: string }) =>
    unwrap(await apiClient.patch<{ success: true; data: AgencyProfileDetail }>(`/api/workspaces/${id}/agency/profile`, data, { headers: { 'X-Workspace-Id': id } })),
  updateAgencySettings: async (id: string, data: { currency: string; timezone: string }) =>
    unwrap(await apiClient.patch<{ success: true; data: AgencyProfileDetail }>(`/api/workspaces/${id}/agency/settings`, data, { headers: { 'X-Workspace-Id': id } })),
};
