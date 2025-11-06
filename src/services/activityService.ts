import api from "@/api/apiClient";
import type {
  Activity,
  ActivityFormData,
  ActivityFilters,
  PaginatedResponse,
} from "@/types/entities";

// ============================================
// CRUD de Actividades
// ============================================

export async function fetchActivities(
  filters?: ActivityFilters & { page?: number; pageSize?: number }
): Promise<PaginatedResponse<Activity>> {
  const { data } = await api.post<PaginatedResponse<Activity>>("/api/activities/list", filters || {});
  return data;
}

export async function getAllActivities(): Promise<Activity[]> {
  const { data } = await api.get<Activity[]>("/api/activities");
  return data;
}

export async function getActivity(id: string): Promise<Activity> {
  const { data } = await api.get<Activity>(`/api/activities/${id}`);
  return data;
}

export async function createActivity(payload: ActivityFormData): Promise<Activity> {
  const { data } = await api.post<Activity>("/api/activities", payload);
  return data;
}

export async function updateActivity(id: string, payload: Partial<ActivityFormData>): Promise<Activity> {
  const { data } = await api.put<Activity>(`/api/activities/${id}`, payload);
  return data;
}

export async function deleteActivity(id: string): Promise<void> {
  await api.delete(`/api/activities/${id}`);
}

// ============================================
// Horarios de Actividades
// ============================================

export async function getActivitySchedules(activityId: string): Promise<any[]> {
  const { data } = await api.get<any[]>(`/api/activities/${activityId}/schedules`);
  return data;
}

