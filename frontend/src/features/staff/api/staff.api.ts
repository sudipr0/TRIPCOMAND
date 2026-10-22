import type {
  CreateStaffDocumentInput,
  CreateStaffInput,
  ListStaffInput,
  ListStaffResult,
  StaffDocumentDetail,
  StaffProfileDetail,
  UpdateStaffInput,
  VerifyStaffDocumentInput,
} from '@tripchange/shared';

import { apiClient, unwrap, type ApiEnvelope } from '@/lib/api-client';

const base = (workspaceId: string) => `/api/workspaces/${workspaceId}/staff`;
const documentsBase = (workspaceId: string) => `/api/workspaces/${workspaceId}/staff-documents`;

export const staffApi = {
  list: async (workspaceId: string, params: ListStaffInput) =>
    unwrap(await apiClient.get<ApiEnvelope<ListStaffResult>>(base(workspaceId), { params })),
  get: async (workspaceId: string, staffId: string) =>
    unwrap(await apiClient.get<ApiEnvelope<StaffProfileDetail>>(`${base(workspaceId)}/${staffId}`)),
  create: async (workspaceId: string, input: CreateStaffInput) =>
    unwrap(await apiClient.post<ApiEnvelope<StaffProfileDetail>>(base(workspaceId), input)),
  update: async (workspaceId: string, staffId: string, input: UpdateStaffInput) =>
    unwrap(await apiClient.patch<ApiEnvelope<StaffProfileDetail>>(`${base(workspaceId)}/${staffId}`, input)),
  delete: async (workspaceId: string, staffId: string) =>
    unwrap(await apiClient.delete<ApiEnvelope<{ success: true; id: string }>>(`${base(workspaceId)}/${staffId}`)),
  createDocument: async (workspaceId: string, staffId: string, input: CreateStaffDocumentInput) =>
    unwrap(await apiClient.post<ApiEnvelope<StaffDocumentDetail>>(`${base(workspaceId)}/${staffId}/documents`, input)),
  verifyDocument: async (workspaceId: string, documentId: string, input: VerifyStaffDocumentInput) =>
    unwrap(await apiClient.patch<ApiEnvelope<StaffDocumentDetail>>(`${documentsBase(workspaceId)}/${documentId}/verify`, input)),
  deleteDocument: async (workspaceId: string, documentId: string) =>
    unwrap(await apiClient.delete<ApiEnvelope<{ success: true; id: string }>>(`${documentsBase(workspaceId)}/${documentId}`)),
};
