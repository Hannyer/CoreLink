import api from "@/api/apiClient";
import type { SelectOption } from "@/components/form/FormSelect";

export interface MenuPermissionRow {
  menuId: string;
  parentId: string | null;
  code: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  routePath?: string | null;
  section?: string | null;
  sortOrder: number;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface RolePermissionsResponse {
  roleId: string;
  roleName: string | null;
  items: MenuPermissionRow[];
}

export interface PermissionPayload {
  menuId: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface DynamicMenuItem {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  routePath: string;
  section: string | null;
  sortOrder: number;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface DynamicMenuResponse {
  roleId: string;
  items: DynamicMenuItem[];
  sections: Record<string, DynamicMenuItem[]>;
  unsectioned: DynamicMenuItem[];
}

export async function fetchPermissionsByRole(
  roleId: string
): Promise<RolePermissionsResponse> {
  const { data } = await api.get<RolePermissionsResponse>(
    `/api/security/roles/${roleId}/permissions`
  );
  return data;
}

export async function savePermissionsByRole(
  roleId: string,
  permissions: PermissionPayload[]
): Promise<RolePermissionsResponse> {
  const { data } = await api.put<RolePermissionsResponse>(
    `/api/security/roles/${roleId}/permissions`,
    { permissions }
  );
  return data;
}

export async function fetchDynamicMenu(roleId: string): Promise<DynamicMenuResponse> {
  const { data } = await api.get<DynamicMenuResponse>(
    `/api/security/menu/${roleId}`
  );
  return data;
}

export async function fetchRolesForSecurity(): Promise<SelectOption[]> {
  const { data } = await api.get<any[]>("/api/roles/select");
  if (!Array.isArray(data)) return [];
  return data.map((r) => ({
    value: String(r.value),
    label: r.label ?? String(r.value),
  }));
}

export const USER_MENU_STORAGE_KEY = "userMenu";

export function storeUserMenu(menu: DynamicMenuResponse) {
  localStorage.setItem(USER_MENU_STORAGE_KEY, JSON.stringify(menu));
}

export function getStoredUserMenu(): DynamicMenuResponse | null {
  const raw = localStorage.getItem(USER_MENU_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DynamicMenuResponse;
  } catch {
    return null;
  }
}

export function clearStoredUserMenu() {
  localStorage.removeItem(USER_MENU_STORAGE_KEY);
}
