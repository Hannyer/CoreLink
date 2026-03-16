import api from "@/api/apiClient";
import type { PaginatedResponse, PaymentType } from "@/types/entities";

function mapApiPaymentType(apiPaymentType: any): PaymentType {
  return {
    id: apiPaymentType.id,
    name: apiPaymentType.name,
    status: apiPaymentType.status ?? true,
    createdAt: apiPaymentType.createdAt || apiPaymentType.created_at,
    updatedAt: apiPaymentType.updatedAt || apiPaymentType.updated_at,
  };
}

export async function fetchPaymentTypesWithPagination(
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResponse<PaymentType>> {
  const params: any = { page, limit };
  const { data } = await api.get<any>("/api/payment-types", { params });

  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiPaymentType),
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

