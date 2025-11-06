import api from "@/api/apiClient";
import type {
  Schedule,
  DayOfWeek,
  PaginatedResponse,
} from "@/types/entities";

// ============================================
// CRUD de Horarios
// ============================================

export interface ScheduleFormData {
  activityId: string;
  time: string; // HH:mm
  dayOfWeek?: DayOfWeek;
  date?: string; // Para horarios específicos
  isActive: boolean;
  capacity?: number;
}

export async function fetchSchedules(params?: {
  activityId?: string;
  date?: string;
  dayOfWeek?: DayOfWeek;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<Schedule>> {
  const { data } = await api.post<PaginatedResponse<Schedule>>("/api/schedules/list", params || {});
  return data;
}

export async function getActivitySchedules(activityId: string, date?: string): Promise<Schedule[]> {
  const { data } = await api.get<Schedule[]>(`/api/schedules/activity/${activityId}`, {
    params: { date },
  });
  return data;
}

export async function getSchedule(id: string): Promise<Schedule> {
  const { data } = await api.get<Schedule>(`/api/schedules/${id}`);
  return data;
}

export async function createSchedule(payload: ScheduleFormData): Promise<Schedule> {
  const { data } = await api.post<Schedule>("/api/schedules", payload);
  return data;
}

export async function updateSchedule(id: string, payload: Partial<ScheduleFormData>): Promise<Schedule> {
  const { data } = await api.put<Schedule>(`/api/schedules/${id}`, payload);
  return data;
}

export async function deleteSchedule(id: string): Promise<void> {
  await api.delete(`/api/schedules/${id}`);
}

// ============================================
// Horarios del Día
// ============================================

export async function getDaySchedules(date: string): Promise<Schedule[]> {
  const { data } = await api.get<Schedule[]>(`/api/schedules/day/${date}`);
  return data;
}

export async function updateDaySchedules(date: string, schedules: Partial<Schedule>[]): Promise<Schedule[]> {
  const { data } = await api.put<Schedule[]>(`/api/schedules/day/${date}`, { schedules });
  return data;
}

