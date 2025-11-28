import api from "@/api/apiClient";
import type {
  Activity,
  ActivityFormData,
  ActivitySchedule,
  ActivityScheduleFormData,
  ActivityFilters,
  PaginatedResponse,
} from "@/types/entities";

// ============================================
// CRUD de Actividades
// ============================================

/**
 * Función auxiliar para mapear la respuesta del API al formato del frontend
 */
function mapApiActivityToActivity(apiActivity: any): Activity {
  return {
    id: apiActivity.id,
    activityTypeId: apiActivity.activityTypeId || apiActivity.activity_type_id,
    title: apiActivity.title,
    partySize: apiActivity.partySize ?? apiActivity.party_size ?? 0,
    status: apiActivity.status ?? true,
    activityTypeName: apiActivity.activityTypeName || apiActivity.activity_type_name,
    schedulesCount: apiActivity.schedulesCount ?? apiActivity.schedules_count ?? 0,
    schedules: apiActivity.schedules ? apiActivity.schedules.map(mapApiScheduleToSchedule) : undefined,
    guides: apiActivity.guides,
    languages: apiActivity.languages,
  };
}

/**
 * Función auxiliar para mapear schedules del API
 */
function mapApiScheduleToSchedule(apiSchedule: any): ActivitySchedule {
  return {
    id: apiSchedule.id,
    capacity: apiSchedule.capacity ?? 0,
    bookedCount: apiSchedule.bookedCount ?? 0,  
    activityId: apiSchedule.activityId || apiSchedule.activity_id,
    scheduledStart: apiSchedule.scheduledStart || apiSchedule.scheduled_start,
    scheduledEnd: apiSchedule.scheduledEnd || apiSchedule.scheduled_end,
    status: apiSchedule.status ?? true,
    activityTitle: apiSchedule.activityTitle || apiSchedule.activity_title,
  };
}

/**
 * Lista actividades con paginación (endpoint GET /api/activities)
 * Compatible con la funcionalidad de ActivitiesPage.tsx
 */
export async function fetchActivitiesWithPagination(
  page: number = 1,
  limit: number = 10,
  status: boolean | null = null
): Promise<PaginatedResponse<Activity>> {
  const params: any = { page, limit };
  if (status !== null) {
    params.status = status;
  }

  const { data } = await api.get<any>("/api/activities", { params });

  // Mapear la respuesta del API al formato PaginatedResponse
  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiActivityToActivity),
      total: data.pagination?.total || data.total || 0,
      page: data.pagination?.page || data.page || page,
      pageSize: data.pagination?.limit || data.limit || data.pageSize || limit,
      totalPages: data.pagination?.totalPages || data.totalPages || 1,
    };
  }

  // Fallback: si no hay items, devolver respuesta vacía
  return {
    items: [],
    total: 0,
    page: page,
    pageSize: limit,
    totalPages: 0,
  };
}

/**
 * Obtiene una actividad por ID (endpoint GET /api/activities/{id})
 */
export async function getActivity(id: string): Promise<Activity> {
  const { data } = await api.get<any>(`/api/activities/${id}`);
  return mapApiActivityToActivity(data);
}

/**
 * Crea una nueva actividad (endpoint POST /api/activities)
 */
export async function createActivity(payload: ActivityFormData): Promise<Activity> {
  const apiPayload = {
    activityTypeId: payload.activityTypeId,
    title: payload.title,
    partySize: payload.partySize,
    status: payload.status ?? true,
  };

  const { data } = await api.post<any>("/api/activities", apiPayload);
  return mapApiActivityToActivity(data);
}

/**
 * Actualiza una actividad existente (endpoint PUT /api/activities/{id})
 */
export async function updateActivity(id: string, payload: Partial<ActivityFormData>): Promise<Activity> {
  const apiPayload: any = {};

  if (payload.activityTypeId !== undefined) apiPayload.activityTypeId = payload.activityTypeId;
  if (payload.title !== undefined) apiPayload.title = payload.title;
  if (payload.partySize !== undefined) apiPayload.partySize = payload.partySize;
  if (payload.status !== undefined) apiPayload.status = payload.status;

  const { data } = await api.put<any>(`/api/activities/${id}`, apiPayload);
  return mapApiActivityToActivity(data);
}

/**
 * Elimina una actividad (endpoint DELETE /api/activities/{id})
 */
export async function deleteActivity(id: string): Promise<void> {
  await api.delete(`/api/activities/${id}`);
}

/**
 * Activa o inactiva una actividad (endpoint PUT /api/activities/{id}/toggle-status)
 */
export async function toggleActivityStatus(id: string, status: boolean): Promise<Activity> {
  const { data } = await api.put<any>(`/api/activities/${id}/toggle-status`, { status });
  return mapApiActivityToActivity(data);
}

// ============================================
// CRUD de Planeaciones (Schedules)
// ============================================

/**
 * Obtiene todas las planeaciones de una actividad (endpoint GET /api/activities/{activityId}/schedules)
 */
export async function getActivitySchedules(activityId: string): Promise<ActivitySchedule[]> {
  const { data } = await api.get<any[]>(`/api/activities/${activityId}/schedules`);
  return data.map(mapApiScheduleToSchedule);
}

/**
 * Obtiene una planeación por ID (endpoint GET /api/activities/schedules/{scheduleId})
 */
export async function getScheduleById(scheduleId: string): Promise<ActivitySchedule> {
  const { data } = await api.get<any>(`/api/activities/schedules/${scheduleId}`);
  return mapApiScheduleToSchedule(data);
}

/**
 * Crea una nueva planeación para una actividad (endpoint POST /api/activities/{activityId}/schedules)
 */
export async function createSchedule(
  activityId: string,
  payload: ActivityScheduleFormData
): Promise<ActivitySchedule> {
  const apiPayload = {
    scheduledStart: payload.scheduledStart,
    scheduledEnd: payload.scheduledEnd,
    status: payload.status ?? true,
  };

  const { data } = await api.post<any>(`/api/activities/${activityId}/schedules`, apiPayload);
  return mapApiScheduleToSchedule(data);
}

/**
 * Actualiza una planeación (endpoint PUT /api/activities/schedules/{scheduleId})
 */
export async function updateSchedule(
  scheduleId: string,
  payload: Partial<ActivityScheduleFormData>
): Promise<ActivitySchedule> {
  const apiPayload: any = {};

  if (payload.scheduledStart !== undefined) apiPayload.scheduledStart = payload.scheduledStart;
  if (payload.scheduledEnd !== undefined) apiPayload.scheduledEnd = payload.scheduledEnd;
  if (payload.status !== undefined) apiPayload.status = payload.status;

  const { data } = await api.put<any>(`/api/activities/schedules/${scheduleId}`, apiPayload);
  return mapApiScheduleToSchedule(data);
}

/**
 * Elimina una planeación (endpoint DELETE /api/activities/schedules/{scheduleId})
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  await api.delete(`/api/activities/schedules/${scheduleId}`);
}

/**
 * Activa o inactiva una planeación (endpoint PUT /api/activities/schedules/{scheduleId}/toggle-status)
 */
export async function toggleScheduleStatus(scheduleId: string, status: boolean): Promise<ActivitySchedule> {
  const { data } = await api.put<any>(`/api/activities/schedules/${scheduleId}/toggle-status`, { status });
  return mapApiScheduleToSchedule(data);
}

// ============================================
// Funciones Legacy (mantener para compatibilidad)
// ============================================

/**
 * @deprecated Usar fetchActivitiesWithPagination() en su lugar
 */
export async function fetchActivities(
  filters?: ActivityFilters & { page?: number; pageSize?: number }
): Promise<PaginatedResponse<Activity>> {
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 10;
  const status = filters?.status === 'activa' ? true : filters?.status === 'inactiva' ? false : null;
  return fetchActivitiesWithPagination(page, pageSize, status);
}

/**
 * @deprecated Usar fetchActivitiesWithPagination() en su lugar
 */
export async function getAllActivities(): Promise<Activity[]> {
  const response = await fetchActivitiesWithPagination(1, 100);
  return response.items;
}
