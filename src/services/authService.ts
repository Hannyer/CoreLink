// src/services/authService.ts
import api from "@/api/apiClient";
import { setAuthToken, clearAuthToken } from "@/api/auth";

export interface ApiUser {
  ID: number;
  ID_Role: number;
  Name: string;
  Email: string;
  Password?: string; 
}

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

export async function login(payload: { username: string; password: string }): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/api/auth/login", payload);

  // No persistir Password
  const { Password: _omit, ...safeUser } = data.user;

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(safeUser));
  setAuthToken(data.token);

  return { token: data.token, user: safeUser as ApiUser };
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  clearAuthToken();
}

export function getCurrentUser(): ApiUser | null {
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as ApiUser) : null;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("token");
}
