import type { PermissionCode, WorkspaceSummary } from '@trailcomand/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WorkspaceState {
  currentWorkspaceId: string | null;
  workspaces: WorkspaceSummary[];
  permissions: PermissionCode[];
  setWorkspaces: (workspaces: WorkspaceSummary[]) => void;
  setCurrentWorkspace: (workspaceId: string | null) => void;
  clearWorkspaces: () => void;
  hasPermission: (permission: PermissionCode) => boolean;
}

function permissionsFor(workspaces: WorkspaceSummary[], workspaceId: string | null) {
  return workspaces.find((workspace) => workspace.id === workspaceId)?.permissions ?? [];
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      currentWorkspaceId: null,
      workspaces: [],
      permissions: [],
      setWorkspaces: (workspaces) => {
        const currentId = get().currentWorkspaceId;
        const nextId = workspaces.some((workspace) => workspace.id === currentId)
          ? currentId
          : workspaces[0]?.id ?? null;
        set({
          workspaces,
          currentWorkspaceId: nextId,
          permissions: permissionsFor(workspaces, nextId),
        });
      },
      setCurrentWorkspace: (workspaceId) =>
        set({
          currentWorkspaceId: workspaceId,
          permissions: permissionsFor(get().workspaces, workspaceId),
        }),
      clearWorkspaces: () => set({ currentWorkspaceId: null, workspaces: [], permissions: [] }),
      hasPermission: (permission) => get().permissions.includes(permission),
    }),
    {
      name: 'trailcomand-workspace',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentWorkspaceId: state.currentWorkspaceId }),
    },
  ),
);
