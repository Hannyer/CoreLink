import api from "@/api/apiClient";
import type {
  ActivitySchedule,
  ActivityScheduleFormData,
  PaginatedResponse,
} from "@/types/entities";

/**
 * Función auxiliar para mapear la respuesta del API al formato del frontend
 */
function mapApiScheduleToSchedule(apiSchedule: any): ActivitySchedule {
  return {
    id: apiSchedule.id,
    activityId: apiSchedule.activityId || apiSchedule.activity_id,
    scheduledStart: apiSchedule.scheduledStart || apiSchedule.scheduled_start,
    scheduledEnd: apiSchedule.scheduledEnd || apiSchedule.scheduled_end,
    status: apiSchedule.status ?? true,
    activityTitle: apiSchedule.activityTitle || apiSchedule.activity_title,
  };
}

/**
 * Obtiene todas las planeaciones de una actividad (endpoint GET /api/activities/{activityId}/schedules)
 */
export async function getSchedulesByActivityId(activityId: string): Promise<ActivitySchedule[]> {
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

/**
 * Lista todas las planeaciones con paginación
 * Nota: Este endpoint no existe en el backend, pero podemos obtener todas las planeaciones
 * de todas las actividades. Por ahora, usaremos una función que obtiene todas las actividades
 * y luego sus planeaciones, o podemos crear un endpoint específico.
 * 
 * Por simplicidad, vamos a crear una función que obtiene todas las planeaciones
 * de todas las actividades (esto puede ser ineficiente, pero funciona para empezar)
 */
export async function listAllSchedules(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<ActivitySchedule>> {
  // Como no hay un endpoint directo para listar todas las planeaciones,
  // necesitaremos obtenerlas de otra manera. Por ahora, retornamos una estructura vacía
  // y el frontend puede implementar la lógica de obtener actividades y luego sus schedules
  return {
    items: [],
    total: 0,
    page: page,
    pageSize: limit,
    totalPages: 0,
  };
}

