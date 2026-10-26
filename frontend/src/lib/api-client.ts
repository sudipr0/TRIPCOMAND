import axios, { AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/auth.store';
import { useWorkspaceStore } from '@/stores/workspace.store';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: ApiError;
}

export function unwrap<T>(response: AxiosResponse<ApiEnvelope<T>>) {
  return response.data.data;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  // A request to a dead network can hang for minutes; fail fast so field syncs fall back to the queue.
  timeout: 20_000,
});

apiClient.interceptors.request.use((config) => {
  const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
  if (workspaceId) {
    config.headers.set('X-Workspace-Id', workspaceId);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const extracted = extractError(error);

    const isSessionProbe = error.config?.url?.endsWith('/api/auth/me');
    if (status === 401 && !isSessionProbe) {
      useAuthStore.getState().clearUser();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    } else if (status === 403) {
      toast.error(extracted?.message ?? 'You do not have permission to do that.');
    } else if (status !== undefined && status >= 500) {
      toast.error('Something went wrong. Please try again.');
    }

    return Promise.reject(error);
  },
);

export function extractError(error: unknown): ApiError | null {
  if (!(error instanceof AxiosError)) return null;
  const payload = error.response?.data as
    | { error?: ApiError; message?: string; code?: string; details?: unknown }
    | undefined;
  if (!payload) return null;
  if (payload.error) return payload.error;
  if (payload.message) {
    return {
      code: payload.code ?? 'UNKNOWN_ERROR',
      message: payload.message,
      details: payload.details,
    };
  }
  return null;
}
