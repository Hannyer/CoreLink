import api from "@/api/apiClient";
import type { PaginatedResponse, CardType } from "@/types/entities";

function mapApiCardType(apiCardType: any): CardType {
  return {
    id: apiCardType.id,
    name: apiCardType.name,
    status: apiCardType.status ?? true,
    createdAt: apiCardType.createdAt || apiCardType.created_at,
    updatedAt: apiCardType.updatedAt || apiCardType.updated_at,
  };
}

export async function fetchCardTypesWithPagination(
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<CardType>> {
  const params: any = { page, limit };
  const { data } = await api.get<any>("/api/card-types", { params });

  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiCardType),
      total: data.pagination?.total || data.total || 0,
      page: data.pagination?.page || data.page || page,
      pageSize: data.pagination?.limit || data.limit || data.pageSize || limit,
      totalPages: data.pagination?.totalPages || data.totalPages || 1,
    };
  }

  return {
    items: [],
    total: 0,
    page,
    pageSize: limit,
    totalPages: 0,
  };
}

