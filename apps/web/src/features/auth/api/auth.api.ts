import { apiClient } from "../../../lib/api-client";
import type {
  UserProfile,
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@tripchange/shared";

export interface AuthResponse {
  user: UserProfile;
  sessionId: string;
  initialWorkspaceId?: string;
}

export const authApi = {
  async register(data: RegisterInput): Promise<AuthResponse> {
    const res = await apiClient.post<{ success: boolean; data: AuthResponse }>(
      "/api/auth/register",
      data,
    );
    return res.data.data;
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    const res = await apiClient.post<{ success: boolean; data: AuthResponse }>(
      "/api/auth/login",
      data,
    );
    return res.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/auth/logout");
  },

  async forgotPassword(
    data: ForgotPasswordInput,
  ): Promise<{ message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      "/api/auth/forgot-password",
      data,
    );
    return { message: res.data.message };
  },

  async resetPassword(data: ResetPasswordInput): Promise<{ message: string }> {
    const res = await apiClient.post<{ success: boolean; message: string }>(
      "/api/auth/reset-password",
      data,
    );
    return { message: res.data.message };
  },

  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get<{ success: boolean; data: UserProfile }>(
      "/api/auth/me",
    );
    return res.data.data;
  },
};
