import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let currentWorkspaceId: string | null = null;

export const setApiWorkspaceId = (workspaceId: string | null) => {
  currentWorkspaceId = workspaceId;
};

apiClient.interceptors.request.use((config) => {
  if (currentWorkspaceId) {
    config.headers["x-workspace-id"] = currentWorkspaceId;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data?.error;
    const message =
      errorData?.message || error.message || "An unexpected error occurred";
    return Promise.reject(new Error(message));
  },
);
