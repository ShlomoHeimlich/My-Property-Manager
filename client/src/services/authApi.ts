import {
  apiRequest,
  ApiError,
  clearAuthToken,
  saveAuthToken,
} from "./apiClient";

export type User = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

type Credentials = {
  email: string;
  password: string;
  name?: string;
};

export { ApiError };

export const authApi = {
  login(credentials: Credentials, onSuccess?: (message: string) => void) {
    return apiRequest<AuthResponse>(
      "/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      },
      onSuccess,
    );
  },

  register(credentials: Credentials, onSuccess?: (message: string) => void) {
    return apiRequest<AuthResponse>(
      "/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      },
      onSuccess,
    );
  },

  async currentUser() {
    const token = localStorage.getItem("property-manager-token");
    if (!token) return null;

    try {
      const result = await apiRequest<{ user: User }>("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return result.user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthToken();
      }
      throw error;
    }
  },

  saveToken(token: string) {
    saveAuthToken(token);
  },

  clearToken() {
    clearAuthToken();
  },
};
