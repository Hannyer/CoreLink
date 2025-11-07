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

/**
 * Función auxiliar para mapear la respuesta del API al formato del frontend
 */
function mapApiGuideToGuide(apiGuide: any): Guide {
  return {
    id: apiGuide.id,
    name: apiGuide.fullName || apiGuide.name,
    email: apiGuide.email || undefined,
    phone: apiGuide.phone || undefined,
    // Manejar tanto camelCase como minúsculas del API
    isLeader: apiGuide.isLeader ?? apiGuide.isleader ?? apiGuide.is_leader ?? false,
    maxPartySize: apiGuide.maxPartySize ?? apiGuide.maxpartysize ?? apiGuide.max_party_size ?? undefined,
    status: apiGuide.status ? 'activo' : 'inactivo',
    createdAt: apiGuide.createdAt || new Date().toISOString(),
    updatedAt: apiGuide.updatedAt || new Date().toISOString(),
  };
}

/**
 * Lista todas las guías (endpoint GET /api/guides)
 * Compatible con la funcionalidad de GuidesPage.tsx
 * @deprecated Usar fetchGuidesPaginated() para obtener respuesta paginada
 */
export async function fetchGuides(): Promise<Guide[]> {
  const { data } = await api.get<any>("/api/guides");
  
  // Manejar diferentes formatos de respuesta del API
  const list = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];

  if (!Array.isArray(list)) {
    throw new Error("La API no está devolviendo un array en /api/guides");
  }

  return list.map(mapApiGuideToGuide);
}

/**
 * Lista guías con paginación (endpoint GET /api/guides)
 * Ahora el endpoint devuelve respuesta paginada
 */
export async function fetchGuidesWithPagination(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Guide>> {
  const { data } = await api.get<any>("/api/guides", {
    params: { page, limit },
  });
  
  // Mapear la respuesta del API al formato PaginatedResponse
  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiGuideToGuide),
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
 * Lista guías con filtros y paginación (endpoint POST /api/guides/list)
 */
export async function fetchGuidesPaginated(
  filters?: GuideFilters & { page?: number; pageSize?: number }
): Promise<PaginatedResponse<Guide>> {
  const { data } = await api.post<any>("/api/guides/list", filters || {});
  
  // Mapear los items de la respuesta paginada
  if (data.items && Array.isArray(data.items)) {
    return {
      ...data,
      items: data.items.map(mapApiGuideToGuide),
    };
  }
  
  return data;
}

/**
 * Obtiene todas las guías sin paginación (endpoint GET /api/guides)
 * @deprecated Usar fetchGuides() en su lugar
 */
export async function getAllGuides(): Promise<Guide[]> {
  return fetchGuides();
}

/**
 * Obtiene una guía por ID (endpoint GET /api/guides/{id})
 */
export async function getGuide(id: string): Promise<Guide> {
  const { data } = await api.get<any>(`/api/guides/${id}`);
  return mapApiGuideToGuide(data);
}

/**
 * Crea una nueva guía (endpoint POST /api/guides)
 */
export async function createGuide(payload: GuideFormData): Promise<Guide> {
  // Mapear formato del frontend al formato del API
  const apiPayload = {
    fullName: payload.name,
    email: payload.email || undefined,
    phone: payload.phone || undefined,
    isLeader: payload.isLeader,
    status: payload.status === 'activo',
    maxPartySize: payload.maxPartySize || undefined,
  };
  
  const { data } = await api.post<any>("/api/guides", apiPayload);
  return mapApiGuideToGuide(data);
}

/**
 * Actualiza una guía existente (endpoint PUT /api/guides/{id})
 */
export async function updateGuide(id: string, payload: Partial<GuideFormData>): Promise<Guide> {
  // Mapear formato del frontend al formato del API
  const apiPayload: any = {};
  
  if (payload.name !== undefined) apiPayload.fullName = payload.name;
  if (payload.email !== undefined) apiPayload.email = payload.email;
  if (payload.phone !== undefined) apiPayload.phone = payload.phone;
  if (payload.isLeader !== undefined) apiPayload.isLeader = payload.isLeader;
  if (payload.status !== undefined) apiPayload.status = payload.status === 'activo';
  if (payload.maxPartySize !== undefined) apiPayload.maxPartySize = payload.maxPartySize;
  
  const { data } = await api.put<any>(`/api/guides/${id}`, apiPayload);
  return mapApiGuideToGuide(data);
}

/**
 * Elimina una guía (endpoint DELETE /api/guides/{id})
 */
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

