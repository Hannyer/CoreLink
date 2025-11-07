import api from "@/api/apiClient";
import type {
  Transport,
  TransportFormData,
  TransportFilters,
  PaginatedResponse,
} from "@/types/entities";

// ============================================
// CRUD de Transportes
// ============================================

/**
 * Función auxiliar para mapear la respuesta del API al formato del frontend
 */
function mapApiTransportToTransport(apiTransport: any): Transport {
  return {
    id: apiTransport.id,
    model: apiTransport.model,
    capacity: apiTransport.capacity,
    operationalStatus: apiTransport.operationalStatus ?? apiTransport.operationalstatus ?? true,
    status: apiTransport.status ?? true,
    createdAt: apiTransport.createdAt || new Date().toISOString(),
    updatedAt: apiTransport.updatedAt || new Date().toISOString(),
  };
}

/**
 * Lista transportes con paginación (endpoint GET /api/transport)
 */
export async function fetchTransportsWithPagination(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Transport>> {
  const { data } = await api.get<any>("/api/transport", {
    params: { page, limit },
  });
  
  // Mapear la respuesta del API al formato PaginatedResponse
  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiTransportToTransport),
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
 * Lista transportes disponibles con paginación (endpoint GET /api/transport/available)
 */
export async function fetchAvailableTransportsWithPagination(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Transport>> {
  const { data } = await api.get<any>("/api/transport/available", {
    params: { page, limit },
  });
  
  // Mapear la respuesta del API al formato PaginatedResponse
  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiTransportToTransport),
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
 * Obtiene un transporte por ID (endpoint GET /api/transport/{id})
 */
export async function getTransport(id: string): Promise<Transport> {
  const { data } = await api.get<any>(`/api/transport/${id}`);
  return mapApiTransportToTransport(data);
}

/**
 * Crea un nuevo transporte (endpoint POST /api/transport)
 */
export async function createTransport(payload: TransportFormData): Promise<Transport> {
  const apiPayload = {
    model: payload.model,
    capacity: payload.capacity,
    operationalStatus: payload.operationalStatus ?? true,
    status: payload.status ?? true,
  };
  
  const { data } = await api.post<any>("/api/transport", apiPayload);
  return mapApiTransportToTransport(data);
}

/**
 * Actualiza un transporte existente (endpoint PUT /api/transport/{id})
 */
export async function updateTransport(id: string, payload: Partial<TransportFormData>): Promise<Transport> {
  const apiPayload: any = {};
  
  if (payload.model !== undefined) apiPayload.model = payload.model;
  if (payload.capacity !== undefined) apiPayload.capacity = payload.capacity;
  if (payload.operationalStatus !== undefined) apiPayload.operationalStatus = payload.operationalStatus;
  if (payload.status !== undefined) apiPayload.status = payload.status;
  
  const { data } = await api.put<any>(`/api/transport/${id}`, apiPayload);
  return mapApiTransportToTransport(data);
}

/**
 * Elimina un transporte (endpoint DELETE /api/transport/{id})
 * Realiza un soft delete (cambia status a false)
 */
export async function deleteTransport(id: string): Promise<void> {
  await api.delete(`/api/transport/${id}`);
}

