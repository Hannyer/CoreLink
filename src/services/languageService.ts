import api from "@/api/apiClient";

export interface Language {
  id: string;
  code: string;
  name: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedLanguageResponse {
  items: Language[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Obtiene todos los idiomas (endpoint GET /api/languages)
 */
export async function getLanguages(): Promise<Language[]> {
  const { data } = await api.get<PaginatedLanguageResponse>("/api/languages");
  
  // Manejar diferentes formatos de respuesta del API
  if (data.items && Array.isArray(data.items)) {
    return data.items;
  }
  
  // Fallback: si no hay items, devolver array vacío
  return [];
}

