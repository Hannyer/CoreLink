import api from "@/api/apiClient";
import type {
  PickupPoint,
  PickupPointFormData,
  PaginatedResponse,
} from "@/types/entities";

// ============================================
// CRUD de Puntos de Recogida
// ============================================

export async function fetchPickupPoints(params?: {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
}): Promise<PaginatedResponse<PickupPoint>> {
  const { data } = await api.post<PaginatedResponse<PickupPoint>>("/api/pickup-points/list", params || {});
  return data;
}

export async function getAllPickupPoints(activeOnly?: boolean): Promise<PickupPoint[]> {
  const { data } = await api.get<PickupPoint[]>("/api/pickup-points", {
    params: { activeOnly },
  });
  return data;
}

export async function getPickupPoint(id: string): Promise<PickupPoint> {
  const { data } = await api.get<PickupPoint>(`/api/pickup-points/${id}`);
  return data;
}

export async function createPickupPoint(payload: PickupPointFormData): Promise<PickupPoint> {
  const { data } = await api.post<PickupPoint>("/api/pickup-points", payload);
  return data;
}

export async function updatePickupPoint(
  id: string,
  payload: Partial<PickupPointFormData>
): Promise<PickupPoint> {
  const { data } = await api.put<PickupPoint>(`/api/pickup-points/${id}`, payload);
  return data;
}

export async function deletePickupPoint(id: string): Promise<void> {
  await api.delete(`/api/pickup-points/${id}`);
}

