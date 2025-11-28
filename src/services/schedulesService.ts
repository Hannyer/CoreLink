import api from "@/api/apiClient";
import type {
  ActivitySchedule,
  ActivityScheduleFormData,
  PaginatedResponse,
  BulkScheduleRequest,
  BulkScheduleResponse,
  ScheduleAvailability,
  ScheduleAvailabilityFilters,
  TimeSlot,
} from "@/types/entities";

/**
 * Función auxiliar para mapear la respuesta del API al formato del frontend
 */
function mapApiScheduleToSchedule(apiSchedule: any): ActivitySchedule {
  const capacity = apiSchedule.capacity ?? 0;
  const bookedCount = typeof apiSchedule.bookedCount === 'string' 
    ? parseInt(apiSchedule.bookedCount, 10) || 0
    : (apiSchedule.bookedCount ?? apiSchedule.booked_count ?? 0);
  
  return {
    id: apiSchedule.id,
    activityId: apiSchedule.activityId || apiSchedule.activity_id,
    scheduledStart: apiSchedule.scheduledStart || apiSchedule.scheduled_start,
    scheduledEnd: apiSchedule.scheduledEnd || apiSchedule.scheduled_end,
    status: apiSchedule.status ?? true,
    activityTitle: apiSchedule.activityTitle || apiSchedule.activity_title,
    capacity,
    bookedCount,
    availableSpaces: Math.max(0, capacity - bookedCount),
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
    capacity: payload.capacity ?? 0,
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
  if (payload.capacity !== undefined) apiPayload.capacity = payload.capacity;

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
 * Inserción masiva de horarios (endpoint POST /api/activities/{activityId}/schedules/bulk)
 */
export async function bulkCreateSchedules(
  request: BulkScheduleRequest
): Promise<BulkScheduleResponse> {
  const { data } = await api.post<BulkScheduleResponse>(
    `/api/activities/${request.activityId}/schedules/bulk`,
    {
      startDate: request.startDate,
      endDate: request.endDate,
      timeSlots: request.timeSlots,
      validateOverlaps: request.validateOverlaps ?? true,
    }
  );
  return data;
}

/**
 * Sumar asistentes a un horario (endpoint POST /api/activities/schedules/{scheduleId}/attendees)
 */
export async function addAttendeesToSchedule(
  scheduleId: string,
  quantity: number
): Promise<ActivitySchedule> {
  const { data } = await api.post<any>(
    `/api/activities/schedules/${scheduleId}/attendees`,
    { quantity }
  );
  return mapApiScheduleToSchedule(data);
}

/**
 * Consultar disponibilidad de horarios (endpoint GET /api/activities/schedules/availability)
 */
export async function getScheduleAvailability(
  filters: ScheduleAvailabilityFilters
): Promise<ScheduleAvailability[]> {
  const params = new URLSearchParams();
  if (filters.activityId) params.append('activityId', filters.activityId);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const { data } = await api.get<ScheduleAvailability[]>(
    `/api/activities/schedules/availability?${params.toString()}`
  );
  return data.map((item) => ({
    ...item,
    availableSpaces: Math.max(0, (item.capacity || 0) - (item.bookedCount || 0)),
  }));
}

/**
 * Obtener horarios disponibles por día (endpoint GET /api/activities/{activityId}/schedules/available)
 */
export async function getAvailableSchedulesByDate(
  activityId: string,
  date: string
): Promise<ActivitySchedule[]> {
  const { data } = await api.get<any[]>(
    `/api/activities/${activityId}/schedules/available?date=${date}`
  );
  return data.map(mapApiScheduleToSchedule);
}

