import api from "@/api/apiClient";
import type {
  ActivityType,
  ActivityTypeFormData,
  PaginatedResponse,
} from "@/types/entities";

function mapApiActivityType(apiItem: any): ActivityType {
  return {
    id: apiItem.id,
    name: apiItem.name,
    description: apiItem.description ?? null,
    status: apiItem.status ?? true,
    createdAt: apiItem.createdAt,
    updatedAt: apiItem.updatedAt,
  };
}

/**
 * Lista tipos de actividad con paginación (GET /api/activity-types)
 */
export async function fetchActivityTypesWithPagination(
  page: number = 1,
  limit: number = 10,
  status: boolean | null = null
): Promise<PaginatedResponse<ActivityType>> {
  const params: Record<string, number | boolean> = { page, limit };
  if (status !== null) {
    params.status = status;
  }

  const { data } = await api.get<any>("/api/activity-types", { params });

  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiActivityType),
      total: data.pagination?.total ?? data.total ?? 0,
      page: data.pagination?.page ?? data.page ?? page,
      pageSize: data.pagination?.limit ?? data.limit ?? data.pageSize ?? limit,
      totalPages: data.pagination?.totalPages ?? data.totalPages ?? 1,
    };
  }

  if (Array.isArray(data)) {
    return {
      items: data.map(mapApiActivityType),
      total: data.length,
      page: 1,
      pageSize: data.length,
      totalPages: 1,
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
 * Catálogo para selects (activos, hasta 100)
 */
export async function getActivityTypes(): Promise<ActivityType[]> {
  const response = await fetchActivityTypesWithPagination(1, 100, true);
  return response.items;
}

export async function getActivityTypeById(id: string): Promise<ActivityType> {
  const { data } = await api.get<any>(`/api/activity-types/${id}`);
  return mapApiActivityType(data);
}

export async function createActivityType(payload: ActivityTypeFormData): Promise<ActivityType> {
  const { data } = await api.post<any>("/api/activity-types", {
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    status: payload.status ?? true,
  });
  return mapApiActivityType(data);
}

export async function updateActivityType(
  id: string,
  payload: Partial<ActivityTypeFormData>
): Promise<ActivityType> {
  const apiPayload: Record<string, unknown> = {};

  if (payload.name !== undefined) apiPayload.name = payload.name.trim();
  if (payload.description !== undefined) {
    apiPayload.description = payload.description?.trim() || null;
  }
  if (payload.status !== undefined) apiPayload.status = payload.status;

  const { data } = await api.put<any>(`/api/activity-types/${id}`, apiPayload);
  return mapApiActivityType(data);
}

export async function deleteActivityType(id: string): Promise<void> {
  await api.delete(`/api/activity-types/${id}`);
}