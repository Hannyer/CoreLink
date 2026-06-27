import api from "@/api/apiClient";
import type {
  BookingAssignments,
  BookingGuideAssignment,
  Transport,
} from "@/types/entities";

// ============================================
// Tipos internos del servicio
// ============================================

export interface AvailableGuide {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  status: boolean;
  speaksEnglish?: boolean;
  languages?: Array<{ id: string; code: string; name: string }>;
}

export interface AvailableDriver {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  status: boolean;
}

export interface ConfirmBookingResult {
  id: string;
  status: string;
  updatedAt: string;
  guides: BookingGuideAssignment[];
  transport: {
    id: string;
    model: string;
    capacity: number;
    licensePlate: string;
    operationalStatus: boolean;
    assignedAt: string;
  } | null;
}

export interface ScheduleGuideAssignment {
  activityScheduleId: string;
  activityId: string;
  activityTitle: string;
  scheduledStart: string;
  scheduledEnd: string;
  bookingCount: number;
  totalPeople: number;
  guides: BookingGuideAssignment[];
}

export interface BookingTransportAssignment {
  bookingId: string;
  customerName: string;
  numberOfPeople: number;
  status: string;
  activityTitle: string;
  scheduledStart: string;
  scheduledEnd: string;
  assignmentId: string;
  transportId: string;
  model: string;
  capacity: number;
  licensePlate: string;
  operationalStatus: boolean;
  assignedAt: string;
  driverId?: string;
  driverName?: string;
}

// ============================================
// Helpers de mapeo
// ============================================

function mapAssignments(data: any): BookingAssignments {
  return {
    guides: (data.guides || []).map((g: any) => ({
      assignmentId: g.assignmentId || g.assignment_id || "",
      id: g.id,
      fullName: g.fullName || g.full_name || "",
      email: g.email ?? undefined,
      phone: g.phone ?? undefined,
      status: g.status ?? true,
      speaksEnglish: g.speaksEnglish ?? g.speaks_english ?? false,
      languages: g.languages || [],
      assignedAt: g.assignedAt || g.assigned_at || "",
    })),
    transport: data.transport
      ? {
          assignmentId: data.transport.assignmentId || "",
          id: data.transport.id,
          model: data.transport.model || "",
          capacity: data.transport.capacity || 0,
          licensePlate: data.transport.licensePlate || data.transport.license_plate || "",
          operationalStatus:
            data.transport.operationalStatus ?? data.transport.operational_status ?? true,
          assignedAt: data.transport.assignedAt || "",
          driverId: data.transport.driverId ?? undefined,
          driverName: data.transport.driverName ?? undefined,
        }
      : null,
  };
}

// ============================================
// Funciones del servicio
// ============================================

/**
 * Lista los usuarios con rol Guía disponibles para asignar
 */
export async function fetchAvailableGuides(bookingId?: string): Promise<AvailableGuide[]> {
  const { data } = await api.get<any[]>("/api/booking-assignments/guides/available", {
    params: bookingId ? { bookingId } : undefined,
  });
  return (data || []).map((g: any) => ({
    id: g.id,
    fullName: g.fullName || g.full_name || "",
    email: g.email ?? undefined,
    phone: g.phone ?? undefined,
    status: g.status ?? true,
    speaksEnglish: g.speaksEnglish ?? g.speaks_english ?? false,
    languages: g.languages || [],
  }));
}

export async function fetchAvailableDrivers(): Promise<AvailableDriver[]> {
  const { data } = await api.get<any[]>("/api/booking-assignments/drivers/available");
  return (data || []).map((d: any) => ({
    id: d.id,
    fullName: d.fullName || d.full_name || "",
    email: d.email ?? undefined,
    phone: d.phone ?? undefined,
    status: d.status ?? true,
  }));
}

export async function fetchScheduleGuideAssignments(): Promise<ScheduleGuideAssignment[]> {
  const { data } = await api.get<any[]>("/api/booking-assignments/schedules/guides");
  return (data || []).map((item: any) => ({
    activityScheduleId: item.activityScheduleId,
    activityId: item.activityId,
    activityTitle: item.activityTitle || "",
    scheduledStart: item.scheduledStart || "",
    scheduledEnd: item.scheduledEnd || "",
    bookingCount: Number(item.bookingCount || 0),
    totalPeople: Number(item.totalPeople || 0),
    guides: (item.guides || []).map((g: any) => ({
      assignmentId: g.assignmentId || "",
      id: g.id,
      fullName: g.fullName || g.full_name || "",
      email: g.email ?? undefined,
      phone: g.phone ?? undefined,
      status: g.status ?? true,
      assignedAt: g.assignedAt || "",
    })),
  }));
}

export async function fetchAvailableGuidesBySchedule(
  activityScheduleId: string
): Promise<AvailableGuide[]> {
  const { data } = await api.get<any[]>(
    `/api/booking-assignments/schedules/${activityScheduleId}/guides/available`
  );
  return (data || []).map((g: any) => ({
    id: g.id,
    fullName: g.fullName || g.full_name || "",
    email: g.email ?? undefined,
    phone: g.phone ?? undefined,
    status: g.status ?? true,
    speaksEnglish: g.speaksEnglish ?? g.speaks_english ?? false,
    languages: g.languages || [],
  }));
}

export async function assignGuidesToSchedule(
  activityScheduleId: string,
  guideIds: string[]
): Promise<ScheduleGuideAssignment[]> {
  const { data } = await api.put<any[]>(
    `/api/booking-assignments/schedules/${activityScheduleId}/guides`,
    { guideIds }
  );
  return (data || []).map((item: any) => ({
    activityScheduleId: item.activityScheduleId,
    activityId: item.activityId,
    activityTitle: item.activityTitle || "",
    scheduledStart: item.scheduledStart || "",
    scheduledEnd: item.scheduledEnd || "",
    bookingCount: Number(item.bookingCount || 0),
    totalPeople: Number(item.totalPeople || 0),
    guides: (item.guides || []).map((g: any) => ({
      assignmentId: g.assignmentId || "",
      id: g.id,
      fullName: g.fullName || g.full_name || "",
      email: g.email ?? undefined,
      phone: g.phone ?? undefined,
      status: g.status ?? true,
      assignedAt: g.assignedAt || "",
    })),
  }));
}

export async function fetchBookingTransportAssignments(): Promise<BookingTransportAssignment[]> {
  const { data } = await api.get<any[]>("/api/booking-assignments/transports/assigned");
  return (data || []).map((item: any) => ({
    bookingId: item.bookingId,
    customerName: item.customerName || "",
    numberOfPeople: Number(item.numberOfPeople || 0),
    status: item.status || "",
    activityTitle: item.activityTitle || "",
    scheduledStart: item.scheduledStart || "",
    scheduledEnd: item.scheduledEnd || "",
    assignmentId: item.assignmentId || "",
    transportId: item.transportId || "",
    model: item.model || "",
    capacity: Number(item.capacity || 0),
    licensePlate: item.licensePlate || "",
    operationalStatus: item.operationalStatus ?? true,
    assignedAt: item.assignedAt || "",
    driverId: item.driverId || "",
    driverName: item.driverName || "",
  }));
}

/**
 * Obtiene las asignaciones actuales (guías + transporte) de una reserva
 */
export async function getBookingAssignments(bookingId: string): Promise<BookingAssignments> {
  const { data } = await api.get<any>(`/api/booking-assignments/${bookingId}`);
  return mapAssignments(data);
}

/**
 * Asigna guías a una reserva (máximo 5)
 */
export async function assignGuidesToBooking(
  bookingId: string,
  guideIds: string[]
): Promise<BookingAssignments> {
  const { data } = await api.put<any>(`/api/booking-assignments/${bookingId}/guides`, {
    guideIds,
  });
  return mapAssignments(data);
}

/**
 * Asigna (o desasigna) un transporte a una reserva
 */
export async function assignTransportToBooking(
  bookingId: string,
  transportId: string | null,
  driverId: string | null = null
): Promise<BookingAssignments> {
  const { data } = await api.put<any>(`/api/booking-assignments/${bookingId}/transport`, {
    transportId,
    driverId,
  });
  return mapAssignments(data);
}

export interface MyGuideAssignment {
  activityScheduleId: string;
  activityTitle: string;
  scheduledStart: string;
  scheduledEnd: string;
  bookingCount: number;
  totalPeople: number;
}

export interface MyDriverAssignment {
  bookingId: string;
  customerName: string;
  customerPhone?: string;
  numberOfPeople: number;
  status: string;
  activityTitle: string;
  scheduledStart: string;
  scheduledEnd: string;
  transportId: string;
  model: string;
  capacity: number;
  licensePlate: string;
}

export async function fetchMyGuideAssignments(): Promise<MyGuideAssignment[]> {
  const { data } = await api.get<any[]>("/api/booking-assignments/me/guide");
  return data || [];
}

export async function fetchMyDriverAssignments(): Promise<MyDriverAssignment[]> {
  const { data } = await api.get<any[]>("/api/booking-assignments/me/driver");
  return data || [];
}

/**
 * Confirma una reserva: cambia su status a 'confirmed'
 */
export async function confirmBooking(bookingId: string): Promise<ConfirmBookingResult> {
  const { data } = await api.put<any>(`/api/booking-assignments/${bookingId}/confirm`);
  return {
    id: data.id,
    status: data.status,
    updatedAt: data.updatedAt || data.updated_at || "",
    guides: (data.guides || []).map((g: any) => ({
      assignmentId: g.assignmentId || "",
      id: g.id,
      fullName: g.fullName || g.full_name || "",
      email: g.email ?? undefined,
      phone: g.phone ?? undefined,
      status: g.status ?? true,
      assignedAt: g.assignedAt || "",
    })),
    transport: data.transport
      ? {
          id: data.transport.id,
          model: data.transport.model,
          capacity: data.transport.capacity,
          licensePlate: data.transport.licensePlate || data.transport.license_plate || "",
          operationalStatus: data.transport.operationalStatus ?? true,
          assignedAt: data.transport.assignedAt || "",
        }
      : null,
  };
}
