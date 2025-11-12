import api from "@/api/apiClient";
import type {
  ActivityByDate,
  ActivityListItem,
  ActivityCreateRequest,
  ActivityCreateResponse,
  ActivityUpdateRequest,
  ActivityAssignment,
  AssignmentReplaceRequest,
  PaginatedResponse,
} from "@/types/entities";

// ============================================
// CRUD de Actividades Programadas (Events)
// ============================================

/**
 * Obtiene actividades por fecha (endpoint GET /api/activities/by-date)
 * Obtiene todas las actividades programadas para una fecha específica con información completa
 * @param date - Fecha en formato YYYY-MM-DD
 * @returns Array de actividades para la fecha especificada
 * @throws Error si la fecha no es válida o no se proporciona
 */
export async function getActivitiesByDate(date: string): Promise<ActivityByDate[]> {
  // Validar formato de fecha
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!date || !dateRegex.test(date)) {
    throw new Error('date es requerido y debe tener formato YYYY-MM-DD');
  }

  const { data } = await api.get<ActivityByDate[]>("/api/activities/by-date", {
    params: { date },
  });
  
  return data;
}

/**
 * Lista actividades con paginación (endpoint GET /api/activities)
 * Obtiene una lista paginada de todas las actividades registradas en el sistema
 * @param page - Número de página (por defecto 1)
 * @param limit - Cantidad de registros por página (por defecto 10, máximo 100)
 * @returns Respuesta paginada con lista de actividades
 */
export async function listActivities(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<ActivityListItem>> {
  // Validaciones
  if (page < 1) {
    throw new Error('page debe ser mayor o igual a 1');
  }
  if (limit < 1) {
    throw new Error('limit debe ser mayor o igual a 1');
  }
  if (limit > 100) {
    throw new Error('limit no puede ser mayor a 100');
  }

  const { data } = await api.get<any>("/api/activities", {
    params: { page, limit },
  });
  
  // Mapear la respuesta del API al formato PaginatedResponse
  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items,
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
 * Obtiene la información completa de una actividad incluyendo guías asignados e idiomas
 * @param id - ID de la actividad (UUID)
 * @returns Información completa de la actividad
 * @throws Error si la actividad no se encuentra o hay un error en la petición
 */
export async function getActivityById(id: string): Promise<ActivityByDate> {
  const { data } = await api.get<ActivityByDate>(`/api/activities/${id}`);
  return data;
}

/**
 * Crea una nueva actividad (endpoint POST /api/activities)
 * Crea una actividad y opcionalmente asigna guías si autoAssign = true
 * @param payload - Datos de la actividad a crear
 * @returns Actividad creada con toda su información
 * @throws Error si faltan datos requeridos o hay un conflicto de asignación
 */
export async function createActivity(
  payload: ActivityCreateRequest
): Promise<ActivityCreateResponse> {
  // Validar campos requeridos
  if (!payload.activityTypeId || !payload.title) {
    throw new Error('activityTypeId, title son requeridos');
  }

  try {
    const { data } = await api.post<ActivityCreateResponse>("/api/activities", payload);
    return data;
  } catch (error: any) {
    // Manejar errores específicos
    if (error.response?.status === 409) {
      throw new Error('Conflicto de asignación (solape o más de un líder)');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Datos inválidos');
    }
    throw error;
  }
}

/**
 * Actualiza una actividad existente (endpoint PUT /api/activities/{id})
 * Actualiza la información de una actividad existente. Solo se actualizan los campos proporcionados.
 * @param id - ID de la actividad (UUID)
 * @param payload - Datos a actualizar (todos los campos son opcionales)
 * @returns Actividad actualizada
 * @throws Error si la actividad no se encuentra o hay un error en la petición
 */
export async function updateActivity(
  id: string,
  payload: ActivityUpdateRequest
): Promise<ActivityByDate> {
  try {
    const { data } = await api.put<ActivityByDate>(`/api/activities/${id}`, payload);
    return data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Actividad no encontrada');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Datos inválidos');
    }
    throw error;
  }
}

/**
 * Elimina una actividad (endpoint DELETE /api/activities/{id})
 * Elimina una actividad y todas sus relaciones (asignaciones de guías e idiomas)
 * @param id - ID de la actividad (UUID)
 * @returns Información de la actividad eliminada
 * @throws Error si la actividad no se encuentra o hay un error en la petición
 */
export async function deleteActivity(id: string): Promise<{ message: string; activity: { id: string; title: string } }> {
  try {
    const { data } = await api.delete<{ message: string; activity: { id: string; title: string } }>(`/api/activities/${id}`);
    return data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Actividad no encontrada');
    }
    throw error;
  }
}

/**
 * Reemplaza completamente las asignaciones de guías de una actividad (endpoint PUT /api/activities/{id}/assignments)
 * Reemplaza todas las asignaciones existentes con las nuevas proporcionadas
 * @param id - ID de la actividad (UUID)
 * @param assignments - Array de asignaciones de guías
 * @returns Objeto con ok: true si la operación fue exitosa
 * @throws Error si hay un conflicto de asignación (solape o más de un líder)
 */
export async function replaceAssignments(
  id: string,
  assignments: ActivityAssignment[]
): Promise<{ ok: boolean }> {
  try {
    const payload: AssignmentReplaceRequest = { assignments };
    const { data } = await api.put<{ ok: boolean }>(`/api/activities/${id}/assignments`, payload);
    return data;
  } catch (error: any) {
    if (error.response?.status === 409) {
      throw new Error('Conflicto de asignación (solape o más de un líder)');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Datos inválidos');
    }
    throw error;
  }
}

