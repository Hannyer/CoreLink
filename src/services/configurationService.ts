import api from "@/api/apiClient";
import type { PaginatedResponse } from "@/types/entities";

export type Configuration = {
  pkConfiguration: number;
  estado: number | null;
  description: string | null;
  observacion: string | null;
  key01: string | null;
  key02: string | null;
  key03: string | null;
  key04: string | null;
  key05: string | null;
  key06: string | null;
  value: string | null;
  displayName: string | null;
};

/**
 * Lista configuraciones con paginación (endpoint GET /api/config)
 */
export async function fetchConfigurationsWithPagination(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Configuration>> {
  const { data } = await api.get<any>("/api/config", {
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
 * Obtiene una configuración por ID (endpoint GET /api/config/{id})
 */
export async function getConfiguration(id: number): Promise<Configuration> {
  const { data } = await api.get<Configuration>(`/api/config/${id}`);
  return data;
}

/**
 * Actualiza solo el campo value de una configuración (endpoint PUT /api/config/{id})
 */
export async function updateConfigurationValue(id: number, value: string): Promise<Configuration> {
  const { data } = await api.put<Configuration>(`/api/config/${id}`, { value });
  return data;
}

/**
 * Tipo para los parámetros de filtrado por llaves
 */
export type ConfigurationKeysFilter = {
  key01?: string | null;
  key02?: string | null;
  key03?: string | null;
  key04?: string | null;
  key05?: string | null;
  key06?: string | null;
};

/**
 * Lista configuraciones filtradas por llaves (endpoint GET /api/config/by-keys)
 * Obtiene una lista de configuraciones filtradas por una o más llaves (KEY01, KEY02, KEY03, KEY04, KEY05, KEY06)
 * @param filters - Objeto con las llaves opcionales para filtrar
 * @returns Array de configuraciones que coinciden con los filtros
 * @throws Error si no se proporciona al menos una llave o si ocurre un error en la petición
 */
export async function listConfigurationsByKeys(
  filters: ConfigurationKeysFilter
): Promise<Configuration[]> {
  // Validar que al menos una llave sea proporcionada
  const hasAnyKey = filters.key01 || filters.key02 || filters.key03 || 
                    filters.key04 || filters.key05 || filters.key06;
  
  if (!hasAnyKey) {
    throw new Error('Debe proporcionar al menos una llave (key01, key02, key03, key04, key05 o key06)');
  }

  // Construir los parámetros de query, excluyendo valores null/undefined
  const params: Record<string, string> = {};
  if (filters.key01 !== null && filters.key01 !== undefined) params.key01 = filters.key01;
  if (filters.key02 !== null && filters.key02 !== undefined) params.key02 = filters.key02;
  if (filters.key03 !== null && filters.key03 !== undefined) params.key03 = filters.key03;
  if (filters.key04 !== null && filters.key04 !== undefined) params.key04 = filters.key04;
  if (filters.key05 !== null && filters.key05 !== undefined) params.key05 = filters.key05;
  if (filters.key06 !== null && filters.key06 !== undefined) params.key06 = filters.key06;

  const { data } = await api.get<Configuration[]>("/api/config/by-keys", {
    params,
  });
  
  return data;
}