import { apiClient } from "../../../lib/api-client";
import type {
  WorkspaceSummary,
  CreateWorkspaceInput,
  MemberDetail,
  RoleDetail,
  InviteMemberInput,
  AuditEventDetail,
} from "@tripchange/shared";

export const workspaceApi = {
  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    const res = await apiClient.get<{
      success: boolean;
      data: WorkspaceSummary[];
    }>("/api/workspaces");
    return res.data.data;
  },

  async createWorkspace(data: CreateWorkspaceInput): Promise<WorkspaceSummary> {
    const res = await apiClient.post<{
      success: boolean;
      data: WorkspaceSummary;
    }>("/api/workspaces", data);
    return res.data.data;
  },

  async getWorkspace(workspaceId: string): Promise<WorkspaceSummary> {
    const res = await apiClient.get<{
      success: boolean;
      data: WorkspaceSummary;
    }>(`/api/workspaces/${workspaceId}`);
    return res.data.data;
  },

  async listMembers(workspaceId: string): Promise<MemberDetail[]> {
    const res = await apiClient.get<{ success: boolean; data: MemberDetail[] }>(
      `/api/workspaces/${workspaceId}/members`,
    );
    return res.data.data;
  },

  async inviteMember(
    workspaceId: string,
    data: InviteMemberInput,
  ): Promise<void> {
    await apiClient.post(`/api/workspaces/${workspaceId}/members`, data);
  },

  async listRoles(workspaceId: string): Promise<RoleDetail[]> {
    const res = await apiClient.get<{ success: boolean; data: RoleDetail[] }>(
      `/api/workspaces/${workspaceId}/roles`,
    );
    return res.data.data;
  },

  async listAuditLogs(
    workspaceId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<{ total: number; events: AuditEventDetail[] }> {
    const res = await apiClient.get<{
      success: boolean;
      data: { total: number; events: AuditEventDetail[] };
    }>(`/api/workspaces/${workspaceId}/audit-logs`, { params });
    return res.data.data;
  },
};
