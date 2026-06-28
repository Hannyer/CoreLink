import api from "@/api/apiClient";
import type {
  ReferencePoint,
  ReferencePointFormData,
  PaginatedResponse,
} from "@/types/entities";

function mapApiReferencePoint(raw: any): ReferencePoint {
  return {
    id: raw.id,
    description: raw.description ?? "",
    status: raw.status ?? true,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? "",
    createdBy: raw.createdBy ?? raw.created_by ?? null,
    updatedBy: raw.updatedBy ?? raw.updated_by ?? null,
    createdByName: raw.createdByName ?? raw.created_by_name ?? null,
    updatedByName: raw.updatedByName ?? raw.updated_by_name ?? null,
  };
}

export async function fetchReferencePointsWithPagination(
  page: number = 1,
  limit: number = 10,
  status: boolean | null = null
): Promise<PaginatedResponse<ReferencePoint>> {
  const params: Record<string, number | boolean> = { page, limit };
  if (status !== null) {
    params.status = status;
  }

  const { data } = await api.get<any>("/api/reference-points", { params });

  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiReferencePoint),
      total: data.pagination?.total ?? data.total ?? 0,
      page: data.pagination?.page ?? data.page ?? page,
      pageSize: data.pagination?.limit ?? data.limit ?? data.pageSize ?? limit,
      totalPages: data.pagination?.totalPages ?? data.totalPages ?? 1,
    };
  }

  return { items: [], total: 0, page, pageSize: limit, totalPages: 0 };
}

export async function getReferencePointById(id: string): Promise<ReferencePoint> {
  const { data } = await api.get<any>(`/api/reference-points/${id}`);
  return mapApiReferencePoint(data);
}

export async function createReferencePoint(
  payload: ReferencePointFormData
): Promise<ReferencePoint> {
  const { data } = await api.post<any>("/api/reference-points", {
    description: payload.description.trim(),
    status: payload.status ?? true,
  });
  return mapApiReferencePoint(data);
}

export async function updateReferencePoint(
  id: string,
  payload: Partial<ReferencePointFormData>
): Promise<ReferencePoint> {
  const apiPayload: Record<string, unknown> = {};
  if (payload.description !== undefined) {
    apiPayload.description = payload.description.trim();
  }
  if (payload.status !== undefined) {
    apiPayload.status = payload.status;
  }

  const { data } = await api.put<any>(`/api/reference-points/${id}`, apiPayload);
  return mapApiReferencePoint(data);
}

export async function deleteReferencePoint(id: string): Promise<void> {
  await api.delete(`/api/reference-points/${id}`);
}
