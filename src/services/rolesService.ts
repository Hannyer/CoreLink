import api from "@/api/apiClient";
import type {
  Role,
  RoleFormData,
  RoleSelectOption,
  PaginatedResponse,
} from "@/types/entities";

function mapApiRole(apiRole: any): Role {
  return {
    id: apiRole.id,
    name: apiRole.name ?? "",
    description: apiRole.description ?? null,
    requiresLicense: apiRole.requiresLicense ?? apiRole.requires_license ?? false,
    status: apiRole.status ?? true,
    createdAt: apiRole.createdAt ?? apiRole.created_at,
    updatedAt: apiRole.updatedAt ?? apiRole.updated_at,
  };
}

/**
 * Lista paginada (GET /api/roles)
 */
export async function fetchRolesWithPagination(
  page: number = 1,
  limit: number = 10,
  status: boolean | null = null
): Promise<PaginatedResponse<Role>> {
  const params: Record<string, number | boolean> = { page, limit };
  if (status !== null) {
    params.status = status;
  }

  const { data } = await api.get<any>("/api/roles", { params });

  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiRole),
      total: data.pagination?.total ?? data.total ?? 0,
      page: data.pagination?.page ?? data.page ?? page,
      pageSize: data.pagination?.limit ?? data.limit ?? data.pageSize ?? limit,
      totalPages: data.pagination?.totalPages ?? data.totalPages ?? 1,
    };
  }

  return {
    items: [],
    total: 0,
    page,
    pageSize: limit,
    totalPages: 0,
  };
}

/**
 * Roles activos para selectores (GET /api/roles/select)
 */
export async function fetchRolesForSelect(): Promise<RoleSelectOption[]> {
  const { data } = await api.get<RoleSelectOption[]>("/api/roles/select");

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((r) => ({
    value: String(r.value),
    label: r.label ?? String(r.value),
    description: r.description ?? null,
    requiresLicense: r.requiresLicense ?? false,
  }));
}

export async function getRoleById(id: string): Promise<Role> {
  const { data } = await api.get<any>(`/api/roles/${id}`);
  return mapApiRole(data);
}

export async function createRole(payload: RoleFormData): Promise<Role> {
  const { data } = await api.post<any>("/api/roles", {
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    requiresLicense: payload.requiresLicense ?? false,
    status: payload.status ?? true,
  });
  return mapApiRole(data);
}

export async function updateRole(id: string, payload: Partial<RoleFormData>): Promise<Role> {
  const apiPayload: Record<string, unknown> = {};

  if (payload.name !== undefined) apiPayload.name = payload.name.trim();
  if (payload.description !== undefined) {
    apiPayload.description = payload.description?.trim() || null;
  }
  if (payload.requiresLicense !== undefined) {
    apiPayload.requiresLicense = payload.requiresLicense;
  }
  if (payload.status !== undefined) apiPayload.status = payload.status;

  const { data } = await api.put<any>(`/api/roles/${id}`, apiPayload);
  return mapApiRole(data);
}

/** Soft delete: desactiva el rol (DELETE /api/roles/{id}) */
export async function deleteRole(id: string): Promise<void> {
  await api.delete(`/api/roles/${id}`);
}
