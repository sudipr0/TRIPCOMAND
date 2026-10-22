import { useQuery } from '@tanstack/react-query';

import { useWorkspaceStore } from '@/stores/workspace.store';
import { membersApi } from '@/features/workspace/api/members.api';

export const workspaceMemberKeys = {
  all: (workspaceId: string) => ['workspace-members', workspaceId] as const,
};

export function useMembers() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);

  return useQuery({
    queryKey: workspaceMemberKeys.all(workspaceId ?? ''),
    queryFn: () => membersApi.listMembers(workspaceId ?? ''),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
    select: (members) => members.filter((member) => member.status === 'ACTIVE'),
  });
}
