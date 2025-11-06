import api from "@/api/apiClient";
import type {
  Guide,
  GuideFormData,
  GuideFilters,
  GuideAssignment,
  PaginatedResponse,
} from "@/types/entities";

// ============================================
// CRUD de Guías
// ============================================

export async function fetchGuides(
  filters?: GuideFilters & { page?: number; pageSize?: number }
): Promise<PaginatedResponse<Guide>> {
  const { data } = await api.post<PaginatedResponse<Guide>>("/api/guides/list", filters || {});
  return data;
}

export async function getAllGuides(): Promise<Guide[]> {
  const { data } = await api.get<Guide[]>("/api/guides");
  return data;
}

export async function getGuide(id: string): Promise<Guide> {
  const { data } = await api.get<Guide>(`/api/guides/${id}`);
  return data;
}

export async function createGuide(payload: GuideFormData): Promise<Guide> {
  const { data } = await api.post<Guide>("/api/guides", payload);
  return data;
}

export async function updateGuide(id: string, payload: Partial<GuideFormData>): Promise<Guide> {
  const { data } = await api.put<Guide>(`/api/guides/${id}`, payload);
  return data;
}

export async function deleteGuide(id: string): Promise<void> {
  await api.delete(`/api/guides/${id}`);
}

// ============================================
// Disponibilidad de Guías
// ============================================

export interface GuideAvailability {
  guideId: string;
  guideName: string;
  isLeader: boolean;
  isAvailable: boolean;
  currentAssignments: number;
  maxCapacity: number;
}

export async function getGuidesAvailability(date: string): Promise<GuideAvailability[]> {
  const { data } = await api.get<GuideAvailability[]>(`/api/guides/availability/${date}`);
  return data;
}

export async function getAvailableLeaders(date: string, partySize: number): Promise<Guide[]> {
  const { data } = await api.get<Guide[]>(`/api/guides/available-leaders`, {
    params: { date, partySize },
  });
  return data;
}

export async function getAvailableGuides(date: string): Promise<Guide[]> {
  const { data } = await api.get<Guide[]>(`/api/guides/available`, {
    params: { date },
  });
  return data;
}

// ============================================
// Asignaciones de Guías
// ============================================

export async function assignGuideToReservation(
  reservationId: string,
  guideId: string,
  isLeader: boolean
): Promise<GuideAssignment> {
  const { data } = await api.post<GuideAssignment>("/api/guides/assignments", {
    reservationId,
    guideId,
    isLeader,
  });
  return data;
}

export async function removeGuideAssignment(assignmentId: string): Promise<void> {
  await api.delete(`/api/guides/assignments/${assignmentId}`);
}

export async function getReservationAssignments(reservationId: string): Promise<GuideAssignment[]> {
  const { data } = await api.get<GuideAssignment[]>(`/api/guides/assignments/reservation/${reservationId}`);
  return data;
}

export async function getGuideAssignments(guideId: string, date?: string): Promise<GuideAssignment[]> {
  const { data } = await api.get<GuideAssignment[]>(`/api/guides/assignments/guide/${guideId}`, {
    params: { date },
  });
  return data;
}

// ============================================
// Asignación Automática
// ============================================

export async function autoAssignGuides(
  reservationId: string,
  partySize: number
): Promise<GuideAssignment[]> {
  const { data } = await api.post<GuideAssignment[]>("/api/guides/auto-assign", {
    reservationId,
    partySize,
  });
  return data;
}

