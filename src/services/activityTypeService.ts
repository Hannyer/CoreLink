import api from "@/api/apiClient";

export interface ActivityType {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

/**
 * Obtiene todos los tipos de actividad (endpoint GET /api/activity-types)
 */
export async function getActivityTypes(): Promise<ActivityType[]> {
  const { data } = await api.get<ActivityType[]>("/api/activity-types");
  return data;
}

/**
 * Obtiene un tipo de actividad por ID (endpoint GET /api/activity-types/{id})
 */
export async function getActivityTypeById(id: string): Promise<ActivityType> {
  const { data } = await api.get<ActivityType>(`/api/activity-types/${id}`);
  return data;
}

