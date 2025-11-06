import api from "@/api/apiClient";
import type {
  Reservation,
  ReservationFormData,
  ReservationFilters,
  PaginatedResponse,
  ReservationReport,
  CommissionReport,
  DailyReport,
} from "@/types/entities";

// ============================================
// CRUD de Reservas
// ============================================

export async function fetchReservations(
  filters?: ReservationFilters & { page?: number; pageSize?: number; sort?: string; order?: "asc" | "desc" }
): Promise<PaginatedResponse<Reservation>> {
  const { data } = await api.post<PaginatedResponse<Reservation>>("/api/reservations/list", filters || {});
  return data;
}

export async function getReservation(id: string): Promise<Reservation> {
  const { data } = await api.get<Reservation>(`/api/reservations/${id}`);
  return data;
}

export async function createReservation(payload: ReservationFormData): Promise<Reservation> {
  const { data } = await api.post<Reservation>("/api/reservations", payload);
  return data;
}

export async function updateReservation(id: string, payload: Partial<ReservationFormData>): Promise<Reservation> {
  const { data } = await api.put<Reservation>(`/api/reservations/${id}`, payload);
  return data;
}

export async function deleteReservation(id: string): Promise<void> {
  await api.delete(`/api/reservations/${id}`);
}

// ============================================
// Búsqueda
// ============================================

export async function searchReservationByReference(referenceNumber: string): Promise<Reservation | null> {
  try {
    const { data } = await api.get<Reservation>(`/api/reservations/reference/${referenceNumber}`);
    return data;
  } catch (error) {
    return null;
  }
}

// ============================================
// Reportes
// ============================================

export async function getReservationReport(
  dateFrom: string,
  dateTo: string
): Promise<ReservationReport[]> {
  const { data } = await api.get<ReservationReport[]>("/api/reservations/reports", {
    params: { dateFrom, dateTo },
  });
  return data;
}

export async function getCommissionReport(
  dateFrom: string,
  dateTo: string
): Promise<CommissionReport[]> {
  const { data } = await api.get<CommissionReport[]>("/api/reservations/reports/commissions", {
    params: { dateFrom, dateTo },
  });
  return data;
}

export async function getDailyReport(date: string): Promise<DailyReport> {
  const { data } = await api.get<DailyReport>(`/api/reservations/reports/daily/${date}`);
  return data;
}

export async function getReportByClients(
  dateFrom: string,
  dateTo: string
): Promise<{ clientName: string; count: number }[]> {
  const { data } = await api.get<{ clientName: string; count: number }[]>(
    "/api/reservations/reports/clients",
    {
      params: { dateFrom, dateTo },
    }
  );
  return data;
}

export async function getReportByDay(
  dateFrom: string,
  dateTo: string
): Promise<{ date: string; count: number }[]> {
  const { data } = await api.get<{ date: string; count: number }[]>("/api/reservations/reports/days", {
    params: { dateFrom, dateTo },
  });
  return data;
}

export async function getReportBySchedule(
  dateFrom: string,
  dateTo: string
): Promise<{ schedule: string; count: number }[]> {
  const { data } = await api.get<{ schedule: string; count: number }[]>(
    "/api/reservations/reports/schedules",
    {
      params: { dateFrom, dateTo },
    }
  );
  return data;
}

// ============================================
// Calendario
// ============================================

export async function getReservationsByDateRange(
  dateFrom: string,
  dateTo: string
): Promise<Reservation[]> {
  const { data } = await api.get<Reservation[]>("/api/reservations/calendar", {
    params: { dateFrom, dateTo },
  });
  return data;
}

export async function getReservationsByDate(date: string): Promise<Reservation[]> {
  const { data } = await api.get<Reservation[]>(`/api/reservations/date/${date}`);
  return data;
}

