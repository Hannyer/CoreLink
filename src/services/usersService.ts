import api from "@/api/apiClient";
import type {
  User,
  UserFormData,
  PaginatedResponse,
} from "@/types/entities";
import type { SelectOption } from "@/components/form/FormSelect";

// ── helpers ──────────────────────────────────────────────────────────

function mapApiUser(raw: any): User {
  return {
    id: raw.id,
    cedula: raw.cedula ?? "",
    email: raw.email ?? "",
    fullName: raw.fullName ?? raw.full_name ?? "",
    phone: raw.phone ?? "",
    roleId: raw.roleId ?? raw.role_id ?? "",
    roleName: raw.roleName ?? raw.role_name ?? undefined,
    roleRequiresLicense:
      raw.roleRequiresLicense ?? raw.role_requires_license ?? false,
    licenseExpirationDate:
      raw.licenseExpirationDate ?? raw.license_expiration_date ?? null,
    speaksEnglish: raw.speaksEnglish ?? raw.speaks_english ?? false,
    status: raw.status ?? true,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? "",
  };
}

// ── Roles para select ────────────────────────────────────────────────

export interface UserRoleOption extends SelectOption {
  description?: string | null;
  requiresLicense?: boolean;
}

/**
 * Roles activos para el combo de usuarios (GET /api/roles/select)
 */
export async function fetchUserRoles(): Promise<UserRoleOption[]> {
  const { data } = await api.get<any[]>("/api/roles/select");

  if (!Array.isArray(data)) return [];

  return data.map((r) => ({
    value: String(r.value),
    label: r.label ?? String(r.value),
    description: r.description ?? null,
    requiresLicense: r.requiresLicense ?? false,
  }));
}

// ── CRUD ─────────────────────────────────────────────────────────────

/**
 * Lista paginada (GET /api/users)
 */
export async function fetchUsersWithPagination(
  page: number = 1,
  limit: number = 10,
  status: boolean | null = null,
  roleId: string | null = null
): Promise<PaginatedResponse<User>> {
  const params: Record<string, number | boolean | string> = { page, limit };
  if (status !== null) params.status = status;
  if (roleId) params.roleId = roleId;

  const { data } = await api.get<any>("/api/users", { params });

  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiUser),
      total: data.pagination?.total ?? data.total ?? 0,
      page: data.pagination?.page ?? data.page ?? page,
      pageSize: data.pagination?.limit ?? data.limit ?? data.pageSize ?? limit,
      totalPages: data.pagination?.totalPages ?? data.totalPages ?? 1,
    };
  }

  return { items: [], total: 0, page, pageSize: limit, totalPages: 0 };
}

export async function getUserById(id: string): Promise<User> {
  const { data } = await api.get<any>(`/api/users/${id}`);
  return mapApiUser(data);
}

export async function createUser(payload: UserFormData): Promise<User> {
  const body: Record<string, unknown> = {
    cedula: payload.cedula.trim(),
    email: payload.email.trim(),
    fullName: payload.fullName.trim(),
    phone: payload.phone.trim(),
    password: payload.password,
    roleId: payload.roleId,
    speaksEnglish: payload.speaksEnglish ?? false,
    status: payload.status ?? true,
  };

  if (payload.licenseExpirationDate) {
    body.licenseExpirationDate = payload.licenseExpirationDate;
  }

  const { data } = await api.post<any>("/api/users", body);
  return mapApiUser(data);
}

export async function updateUser(
  id: string,
  payload: Partial<UserFormData>
): Promise<User> {
  const body: Record<string, unknown> = {};

  if (payload.cedula !== undefined) body.cedula = payload.cedula.trim();
  if (payload.email !== undefined) body.email = payload.email.trim();
  if (payload.fullName !== undefined) body.fullName = payload.fullName.trim();
  if (payload.phone !== undefined) body.phone = payload.phone.trim();
  if (payload.password !== undefined && payload.password !== "") {
    body.password = payload.password;
  }
  if (payload.roleId !== undefined) body.roleId = payload.roleId;
  if (payload.licenseExpirationDate !== undefined) {
    body.licenseExpirationDate = payload.licenseExpirationDate || null;
  }
  if (payload.speaksEnglish !== undefined)
    body.speaksEnglish = payload.speaksEnglish;
  if (payload.status !== undefined) body.status = payload.status;

  const { data } = await api.put<any>(`/api/users/${id}`, body);
  return mapApiUser(data);
}

/** Soft delete: desactiva el usuario (DELETE /api/users/{id}) */
export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/api/users/${id}`);
}
