import type { MemberDetail } from '@tripchange/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const membersApi = {
  listMembers: async (workspaceId: string) =>
    unwrap(await apiClient.get<{ success: true; data: MemberDetail[] }>(`/api/workspaces/${workspaceId}/members`)),
};
