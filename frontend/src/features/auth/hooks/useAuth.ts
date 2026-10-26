import type { LoginInput, RegisterInput } from '@trailcomand/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { extractError } from '@/lib/api-client';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { useWorkspaceStore } from '@/stores/workspace.store';

export function useSession(enabled = true) {
  const { setUser, clearUser, setLoading } = useAuthStore();
  const query = useQuery({
    queryKey: ['session'],
    queryFn: authApi.getSession,
    retry: false,
    staleTime: 30_000,
    enabled,
    throwOnError: false,
  });
  useEffect(() => {
    if (!enabled) return;
    if (query.data) setUser(query.data);
    if (query.isError) clearUser();
    if (!query.isPending) setLoading(false);
  }, [clearUser, enabled, query.data, query.isError, query.isPending, setLoading, setUser]);
  return query;
}

export function useLogin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: async ({ user }) => {
      setUser(user);
      queryClient.setQueryData(['session'], user);
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      navigate('/dashboard', { replace: true });
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace);
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: ({ user }) => {
      setUser(user);
      queryClient.setQueryData(['session'], user);
      setCurrentWorkspace(null);
      navigate('/workspaces/new', { replace: true });
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((state) => state.clearUser);
  const clearWorkspaces = useWorkspaceStore((state) => state.clearWorkspaces);
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearUser();
      clearWorkspaces();
      queryClient.removeQueries({ queryKey: ['session'] });
      navigate('/login', { replace: true });
    },
    onError: (error) => {
      clearUser();
      clearWorkspaces();
      queryClient.removeQueries({ queryKey: ['session'] });
      navigate('/login', { replace: true });
      const apiError = extractError(error);
      if (apiError) toast.error(apiError.message);
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword });
}
