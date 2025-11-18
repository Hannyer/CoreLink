import api from "@/api/apiClient";
import type {
  Company,
  CompanyFormData,
  CompanyFilters,
  PaginatedResponse,
} from "@/types/entities";

/**
 * Función auxiliar para mapear la respuesta del API al formato del frontend
 */
function mapApiCompanyToCompany(apiCompany: any): Company {
  return {
    id: apiCompany.id,
    name: apiCompany.name,
    commissionPercentage: apiCompany.commissionPercentage ?? apiCompany.commission_percentage ?? 0,
    status: apiCompany.status ?? true,
    createdAt: apiCompany.createdAt || apiCompany.created_at,
    updatedAt: apiCompany.updatedAt || apiCompany.updated_at,
  };
}

/**
 * Lista compañías con paginación (endpoint GET /api/companies)
 */
export async function fetchCompaniesWithPagination(
  page: number = 1,
  limit: number = 10,
  status: boolean | null = null
): Promise<PaginatedResponse<Company>> {
  const params: any = { page, limit };
  if (status !== null) {
    params.status = status;
  }

  const { data } = await api.get<any>("/api/companies", { params });

  // Mapear la respuesta del API al formato PaginatedResponse
  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiCompanyToCompany),
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
 * Obtiene una compañía por ID (endpoint GET /api/companies/{id})
 */
export async function getCompany(id: string): Promise<Company> {
  const { data } = await api.get<any>(`/api/companies/${id}`);
  return mapApiCompanyToCompany(data);
}

/**
 * Crea una nueva compañía (endpoint POST /api/companies)
 */
export async function createCompany(payload: CompanyFormData): Promise<Company> {
  const apiPayload = {
    name: payload.name,
    commissionPercentage: payload.commissionPercentage,
    status: payload.status ?? true,
  };

  const { data } = await api.post<any>("/api/companies", apiPayload);
  return mapApiCompanyToCompany(data);
}

/**
 * Actualiza una compañía existente (endpoint PUT /api/companies/{id})
 */
export async function updateCompany(id: string, payload: Partial<CompanyFormData>): Promise<Company> {
  const apiPayload: any = {};

  if (payload.name !== undefined) apiPayload.name = payload.name;
  if (payload.commissionPercentage !== undefined) apiPayload.commissionPercentage = payload.commissionPercentage;
  if (payload.status !== undefined) apiPayload.status = payload.status;

  const { data } = await api.put<any>(`/api/companies/${id}`, apiPayload);
  return mapApiCompanyToCompany(data);
}

/**
 * Elimina una compañía (endpoint DELETE /api/companies/{id})
 */
export async function deleteCompany(id: string): Promise<void> {
  await api.delete(`/api/companies/${id}`);
}

/**
 * Activa o inactiva una compañía (endpoint PUT /api/companies/{id}/toggle-status)
 */
export async function toggleCompanyStatus(id: string, status: boolean): Promise<Company> {
  const { data } = await api.put<any>(`/api/companies/${id}/toggle-status`, { status });
  return mapApiCompanyToCompany(data);
}

