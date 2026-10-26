import type { LoginInput, RegisterInput, ResetPasswordInput, UserProfile } from '@trailcomand/shared';

import { apiClient, unwrap } from '@/lib/api-client';

interface AuthResponse {
  user: UserProfile;
  sessionId?: string;
  initialWorkspaceId?: string;
}

export const authApi = {
  register: async (input: RegisterInput) => unwrap(await apiClient.post<{ success: true; data: AuthResponse }>('/api/auth/register', input)),
  login: async (input: LoginInput) => unwrap(await apiClient.post<{ success: true; data: AuthResponse }>('/api/auth/login', input)),
  logout: async () => apiClient.post('/api/auth/logout'),
  getSession: async () => unwrap(await apiClient.get<{ success: true; data: UserProfile }>('/api/auth/me')),
  forgotPassword: async (email: string) => apiClient.post('/api/auth/forgot-password', { email }),
  resetPassword: async (input: ResetPasswordInput) => apiClient.post('/api/auth/reset-password', input),
};
