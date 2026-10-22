import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../../../stores/auth.store";
import { useWorkspaceStore } from "../../../stores/workspace.store";
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "@tripchange/shared";

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    logout: clearAuth,
  } = useAuthStore();
  const { setCurrentWorkspace, setWorkspaces } = useWorkspaceStore();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data),
    onSuccess: (data) => {
      setUser(data.user);
      toast.success("Welcome back!");
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Login failed");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data),
    onSuccess: (data) => {
      setUser(data.user);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Registration failed");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearAuth();
      setCurrentWorkspace(null);
      setWorkspaces([]);
      queryClient.clear();
      toast.info("You have been logged out");
      navigate("/login");
    },
    onError: () => {
      clearAuth();
      setCurrentWorkspace(null);
      setWorkspaces([]);
      queryClient.clear();
      navigate("/login");
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (data: ForgotPasswordInput) => authApi.forgotPassword(data),
    onSuccess: (res) => {
      toast.success(res.message);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Request failed");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetPasswordInput) => authApi.resetPassword(data),
    onSuccess: (res) => {
      toast.success(res.message);
      navigate("/login");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Reset failed");
    },
  });

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || meQuery.isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    isSubmittingForgot: forgotPasswordMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    isSubmittingReset: resetPasswordMutation.isPending,
  };
}
