import type { UserProfile } from '@trailcomand/shared';
import { create } from 'zustand';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: Boolean(user), isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clearUser: () => set({ user: null, isAuthenticated: false, isLoading: false }),
}));

/** Guides only need the field tools; office roles keep the full workspace. */
export const isGuideRole = (roleName: string | undefined) => roleName?.toLowerCase() === 'guide';
