import type {
  CreateTrekTemplateDayInput, CreateTrekTemplateInput, ListTrekTemplatesQuery,
  ListTrekTemplatesResult, ReorderTrekTemplateDaysInput, TrekTemplateDayDetail, TrekTemplateDetail,
  UpdateTrekTemplateDayInput, UpdateTrekTemplateInput,
} from '@tripchange/shared';

import { apiClient, unwrap, type ApiEnvelope } from '@/lib/api-client';

const base = (workspaceId: string) => `/api/workspaces/${workspaceId}/trek-templates`;
const templatePath = (workspaceId: string, templateId: string) => `${base(workspaceId)}/${templateId}`;
const daysPath = (workspaceId: string, templateId: string) => `${templatePath(workspaceId, templateId)}/days`;

export const trekTemplatesApi = {
  list: async (workspaceId: string, params: ListTrekTemplatesQuery) =>
    unwrap(await apiClient.get<ApiEnvelope<ListTrekTemplatesResult>>(base(workspaceId), { params })),
  get: async (workspaceId: string, templateId: string) =>
    unwrap(await apiClient.get<ApiEnvelope<TrekTemplateDetail>>(templatePath(workspaceId, templateId))),
  create: async (workspaceId: string, input: CreateTrekTemplateInput) =>
    unwrap(await apiClient.post<ApiEnvelope<TrekTemplateDetail>>(base(workspaceId), input)),
  update: async (workspaceId: string, templateId: string, input: UpdateTrekTemplateInput) =>
    unwrap(await apiClient.patch<ApiEnvelope<TrekTemplateDetail>>(templatePath(workspaceId, templateId), input)),
  delete: async (workspaceId: string, templateId: string) =>
    unwrap(await apiClient.delete<ApiEnvelope<{ success: true; id: string }>>(templatePath(workspaceId, templateId))),
  listDays: async (workspaceId: string, templateId: string) =>
    unwrap(await apiClient.get<ApiEnvelope<TrekTemplateDayDetail[]>>(daysPath(workspaceId, templateId))),
  addDay: async (workspaceId: string, templateId: string, input: CreateTrekTemplateDayInput) =>
    unwrap(await apiClient.post<ApiEnvelope<TrekTemplateDayDetail>>(daysPath(workspaceId, templateId), input)),
  updateDay: async (workspaceId: string, templateId: string, dayId: string, input: UpdateTrekTemplateDayInput) =>
    unwrap(await apiClient.patch<ApiEnvelope<TrekTemplateDayDetail>>(`${daysPath(workspaceId, templateId)}/${dayId}`, input)),
  deleteDay: async (workspaceId: string, templateId: string, dayId: string) =>
    unwrap(await apiClient.delete<ApiEnvelope<{ success: true; id: string }>>(`${daysPath(workspaceId, templateId)}/${dayId}`)),
  reorderDays: async (workspaceId: string, templateId: string, input: ReorderTrekTemplateDaysInput) =>
    unwrap(await apiClient.post<ApiEnvelope<TrekTemplateDayDetail[]>>(`${daysPath(workspaceId, templateId)}/reorder`, input)),
};
