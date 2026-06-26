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
export async function fetchAvailableGuides(): Promise<AvailableGuide[]> {
  const { data } = await api.get<any[]>("/api/booking-assignments/guides/available");
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
  transportId: string | null
): Promise<BookingAssignments> {
  const { data } = await api.put<any>(`/api/booking-assignments/${bookingId}/transport`, {
    transportId,
  });
  return mapAssignments(data);
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
