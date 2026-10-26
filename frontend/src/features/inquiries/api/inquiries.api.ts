import type { CreateInquiryInput, InquiryActivityDetail, InquiryDetail, ListInquiriesQuery, ListInquiriesResult, LogInquiryActivityInput, MemberDetail, UpdateInquiryInput } from '@trailcomand/shared';

import { apiClient, unwrap, type ApiEnvelope } from '@/lib/api-client';

const base = (workspaceId: string) => `/api/workspaces/${workspaceId}/inquiries`;

export type InquiryActivityListItem = Pick<InquiryActivityDetail, 'id' | 'activityType' | 'description' | 'createdAt'>;
export interface ConversionResult { inquiryId: string; status: 'QUOTED'; nextStep: string }

export const inquiriesApi = {
  list: async (workspaceId: string, params: ListInquiriesQuery, signal?: AbortSignal) =>
    unwrap(await apiClient.get<ApiEnvelope<ListInquiriesResult>>(base(workspaceId), { params, signal })),
  get: async (workspaceId: string, inquiryId: string) =>
    unwrap(await apiClient.get<ApiEnvelope<InquiryDetail>>(`${base(workspaceId)}/${inquiryId}`)),
  create: async (workspaceId: string, input: CreateInquiryInput) =>
    unwrap(await apiClient.post<ApiEnvelope<InquiryDetail>>(base(workspaceId), input)),
  update: async (workspaceId: string, inquiryId: string, input: UpdateInquiryInput) =>
    unwrap(await apiClient.patch<ApiEnvelope<InquiryDetail>>(`${base(workspaceId)}/${inquiryId}`, input)),
  delete: async (workspaceId: string, inquiryId: string) =>
    unwrap(await apiClient.delete<ApiEnvelope<{ success: true; id: string }>>(`${base(workspaceId)}/${inquiryId}`)),
  convert: async (workspaceId: string, inquiryId: string) =>
    unwrap(await apiClient.post<ApiEnvelope<ConversionResult>>(`${base(workspaceId)}/${inquiryId}/convert`)),
  activities: async (workspaceId: string, inquiryId: string) =>
    unwrap(await apiClient.get<ApiEnvelope<InquiryActivityListItem[]>>(`${base(workspaceId)}/${inquiryId}/activities`)),
  logActivity: async (workspaceId: string, inquiryId: string, input: LogInquiryActivityInput) =>
    unwrap(await apiClient.post<ApiEnvelope<InquiryActivityDetail>>(`${base(workspaceId)}/${inquiryId}/activities`, input)),
  members: async (workspaceId: string) =>
    unwrap(await apiClient.get<ApiEnvelope<MemberDetail[]>>(`/api/workspaces/${workspaceId}/members`)),
};
