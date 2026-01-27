import api from "@/api/apiClient";
import type {
  Booking,
  BookingFormData,
  BookingFilters,
  AvailableSchedule,
  AvailabilityInfo,
  PaginatedResponse,
} from "@/types/entities";

/**
 * Función auxiliar para mapear la respuesta del API al formato del frontend
 */
function mapApiBookingToBooking(apiBooking: any): Booking {
  return {
    id: apiBooking.id,
    activityScheduleId: apiBooking.activityScheduleId || apiBooking.activity_schedule_id,
    companyId: apiBooking.companyId ?? apiBooking.company_id ?? null,
    transport: apiBooking.transport ?? false,
    numberOfPeople: apiBooking.numberOfPeople ?? apiBooking.number_of_people ?? 0,
    adultCount: apiBooking.adultCount ?? apiBooking.adult_count ?? 0,
    childCount: apiBooking.childCount ?? apiBooking.child_count ?? 0,
    seniorCount: apiBooking.seniorCount ?? apiBooking.senior_count ?? 0,
    passengerCount: apiBooking.passengerCount !== undefined ? apiBooking.passengerCount : (apiBooking.passenger_count !== undefined ? apiBooking.passenger_count : null),
    commissionPercentage: apiBooking.commissionPercentage ?? apiBooking.commission_percentage ?? 0,
    customerName: apiBooking.customerName || apiBooking.customer_name || "",
    customerEmail: apiBooking.customerEmail ?? apiBooking.customer_email ?? null,
    customerPhone: apiBooking.customerPhone ?? apiBooking.customer_phone ?? null,
    status: apiBooking.status || "pending",
    createdAt: apiBooking.createdAt || apiBooking.created_at,
    updatedAt: apiBooking.updatedAt || apiBooking.updated_at,
    createdBy: apiBooking.createdBy ?? apiBooking.created_by,
    activityTitle: apiBooking.activityTitle || apiBooking.activity_title,
    scheduledStart: apiBooking.scheduledStart || apiBooking.scheduled_start,
    scheduledEnd: apiBooking.scheduledEnd || apiBooking.scheduled_end,
    companyName: apiBooking.companyName ?? apiBooking.company_name ?? null,
    activityId: apiBooking.activityId || apiBooking.activity_id,
    activityPartySize: apiBooking.activityPartySize ?? apiBooking.activity_party_size,
    companyCommissionPercentage: apiBooking.companyCommissionPercentage ?? apiBooking.company_commission_percentage ?? null,
  };
}

/**
 * Obtiene fechas disponibles para una actividad (endpoint GET /api/bookings/activities/{activityId}/schedules)
 */
export async function getAvailableSchedulesByActivityId(activityId: string): Promise<AvailableSchedule[]> {
  const { data } = await api.get<any[]>(`/api/bookings/activities/${activityId}/schedules`);
  return data.map((item) => {
    // Convertir bookedPeople a número si viene como string
    const bookedPeople = typeof item.bookedPeople === 'string' 
      ? parseInt(item.bookedPeople, 10) || 0
      : (item.bookedPeople || item.booked_people || 0);
    
    const partySize = item.partySize || item.party_size || 0;
    
    // Calcular availableSpaces si no viene del API
    const availableSpaces = item.availableSpaces !== undefined 
      ? item.availableSpaces 
      : (item.available_spaces !== undefined 
          ? item.available_spaces 
          : Math.max(0, partySize - bookedPeople));
    
    return {
      id: item.id,
      activityId: item.activityId || item.activity_id,
      scheduledStart: item.scheduledStart || item.scheduled_start,
      scheduledEnd: item.scheduledEnd || item.scheduled_end,
      status: item.status ?? true,
      activityTitle: item.activityTitle || item.activity_title,
      partySize,
      bookedPeople,
      availableSpaces,
    };
  });
}

/**
 * Valida disponibilidad de espacios (endpoint GET /api/bookings/schedules/{scheduleId}/availability)
 */
export async function checkAvailability(scheduleId: string): Promise<AvailabilityInfo> {
  const { data } = await api.get<any>(`/api/bookings/schedules/${scheduleId}/availability`);
  return {
    scheduleId: data.scheduleId || data.schedule_id,
    activityId: data.activityId || data.activity_id,
    activityTitle: data.activityTitle || data.activity_title,
    partySize: data.partySize || data.party_size || 0,
    bookedPeople: data.bookedPeople || data.booked_people || 0,
    availableSpaces: data.availableSpaces || data.available_spaces || 0,
  };
}

/**
 * Lista reservas con paginación (endpoint GET /api/bookings)
 */
export async function fetchBookingsWithPagination(
  page: number = 1,
  limit: number = 10,
  filters?: BookingFilters
): Promise<PaginatedResponse<Booking>> {
  const params: any = { page, limit };
  if (filters?.status) {
    params.status = filters.status;
  }
  if (filters?.activityScheduleId) {
    params.activityScheduleId = filters.activityScheduleId;
  }

  const { data } = await api.get<any>("/api/bookings", { params });

  // Mapear la respuesta del API al formato PaginatedResponse
  if (data.items && Array.isArray(data.items)) {
    return {
      items: data.items.map(mapApiBookingToBooking),
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
 * Obtiene una reserva por ID (endpoint GET /api/bookings/{id})
 */
export async function getBookingById(id: string): Promise<Booking> {
  const { data } = await api.get<any>(`/api/bookings/${id}`);
  return mapApiBookingToBooking(data);
}

/**
 * Crea una nueva reserva (endpoint POST /api/bookings)
 */
export async function createBooking(payload: BookingFormData): Promise<Booking> {
  const apiPayload: any = {
    activityScheduleId: payload.activityScheduleId,
    numberOfPeople: payload.numberOfPeople,
    adultCount: payload.adultCount ?? 0,
    childCount: payload.childCount ?? 0,
    seniorCount: payload.seniorCount ?? 0,
    customerName: payload.customerName,
    transport: payload.transport ?? false,
    status: payload.status ?? "pending",
  };

  if (payload.companyId != null) apiPayload.companyId = payload.companyId;
  if (payload.transport && payload.passengerCount != null) apiPayload.passengerCount = payload.passengerCount;
  if (payload.commissionPercentage != null) apiPayload.commissionPercentage = payload.commissionPercentage;
  if (payload.customerEmail != null && payload.customerEmail !== "") apiPayload.customerEmail = payload.customerEmail;
  if (payload.customerPhone != null && payload.customerPhone !== "") apiPayload.customerPhone = payload.customerPhone;

  const { data } = await api.post<any>("/api/bookings", apiPayload);
  return mapApiBookingToBooking(data);
}

/**
 * Actualiza una reserva existente (endpoint PUT /api/bookings/{id})
 */
export async function updateBooking(id: string, payload: Partial<BookingFormData>): Promise<Booking> {
  const apiPayload: any = {};

  if (payload.activityScheduleId !== undefined) apiPayload.activityScheduleId = payload.activityScheduleId;
  if (payload.companyId !== undefined) apiPayload.companyId = payload.companyId;
  if (payload.transport !== undefined) apiPayload.transport = payload.transport;
  if (payload.transport && payload.passengerCount != null) apiPayload.passengerCount = payload.passengerCount;
  else if (payload.transport === false) apiPayload.passengerCount = null;
  if (payload.numberOfPeople !== undefined) apiPayload.numberOfPeople = payload.numberOfPeople;
  if (payload.adultCount !== undefined) apiPayload.adultCount = payload.adultCount;
  if (payload.childCount !== undefined) apiPayload.childCount = payload.childCount;
  if (payload.seniorCount !== undefined) apiPayload.seniorCount = payload.seniorCount;
  if (payload.commissionPercentage !== undefined) apiPayload.commissionPercentage = payload.commissionPercentage;
  if (payload.customerName !== undefined) apiPayload.customerName = payload.customerName;
  if (payload.customerEmail !== undefined) apiPayload.customerEmail = payload.customerEmail;
  if (payload.customerPhone !== undefined) apiPayload.customerPhone = payload.customerPhone;
  if (payload.status !== undefined) apiPayload.status = payload.status;

  const { data } = await api.put<any>(`/api/bookings/${id}`, apiPayload);
  return mapApiBookingToBooking(data);
}

/**
 * Cancela una reserva (endpoint PUT /api/bookings/{id}/cancel)
 */
export async function cancelBooking(id: string): Promise<Booking> {
  const { data } = await api.put<any>(`/api/bookings/${id}/cancel`);
  return mapApiBookingToBooking(data);
}

