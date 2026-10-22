import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkspaceSummary } from "@tripchange/shared";
import { setApiWorkspaceId } from "../lib/api-client";

interface WorkspaceState {
  workspaces: WorkspaceSummary[];
  currentWorkspace: WorkspaceSummary | null;
  isLoading: boolean;
  setWorkspaces: (workspaces: WorkspaceSummary[]) => void;
  setCurrentWorkspace: (workspace: WorkspaceSummary | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaces: [],
      currentWorkspace: null,
      isLoading: false,
      setWorkspaces: (workspaces) => {
        set({ workspaces });
      },
      setCurrentWorkspace: (workspace) => {
        setApiWorkspaceId(workspace ? workspace.id : null);
        set({ currentWorkspace: workspace });
      },
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "tc-workspace",
      partialize: (state) => ({ currentWorkspace: state.currentWorkspace }),
      onRehydrateStorage: () => (state) => {
        if (state?.currentWorkspace) {
          setApiWorkspaceId(state.currentWorkspace.id);
        }
      },
    },
  ),
);
