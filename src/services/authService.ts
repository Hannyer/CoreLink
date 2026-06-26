import api from "@/api/apiClient";
import { setAuthToken, clearAuthToken } from "@/api/auth";
import {
  fetchDynamicMenu,
  storeUserMenu,
  clearStoredUserMenu,
} from "@/services/securityService";

/** Usuario autenticado (API actual) */
export interface AuthUser {
  id: string;
  cedula?: string;
  email: string;
  fullName: string;
  phone?: string;
  roleId: string;
  roleName?: string;
  licenseExpirationDate?: string | null;
  speaksEnglish?: boolean;
  status?: boolean;
  isexternal?: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

function normalizeUser(raw: Record<string, unknown>): AuthUser {
  return {
    id: String(raw.id ?? raw.ID ?? ""),
    cedula: (raw.cedula as string) ?? undefined,
    email: String(raw.email ?? raw.Email ?? ""),
    fullName: String(raw.fullName ?? raw.Name ?? raw.full_name ?? ""),
    phone: (raw.phone as string) ?? undefined,
    roleId: String(raw.roleId ?? raw.role_id ?? raw.ID_Role ?? ""),
    roleName: (raw.roleName ?? raw.role_name) as string | undefined,
    licenseExpirationDate: (raw.licenseExpirationDate ??
      raw.license_expiration_date) as string | null | undefined,
    speaksEnglish: Boolean(raw.speaksEnglish ?? raw.speaks_english),
    status: raw.status as boolean | undefined,
    isexternal: raw.isexternal as boolean | undefined,
  };
}

export async function login(payload: {
  username: string;
  password: string;
}): Promise<LoginResponse> {
  const { data } = await api.post<{ token: string; user: Record<string, unknown> }>(
    "/api/auth/login",
    payload
  );

  const user = normalizeUser(data.user);

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(user));
  setAuthToken(data.token);

  if (user.roleId) {
    try {
      const menu = await fetchDynamicMenu(user.roleId);
      storeUserMenu(menu);
    } catch (e) {
      console.warn("No se pudo cargar el menú dinámico:", e);
    }
  }

  return { token: data.token, user };
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  clearStoredUserMenu();
  clearAuthToken();
}

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return normalizeUser(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function getCurrentUserRoleId(): string | null {
  const user = getCurrentUser();
  return user?.roleId || null;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("token");
}

/** Recarga menú del rol actual (p. ej. tras cambiar permisos) */
export async function refreshUserMenu() {
  const roleId = getCurrentUserRoleId();
  if (!roleId) return null;
  const menu = await fetchDynamicMenu(roleId);
  storeUserMenu(menu);
  return menu;
}
