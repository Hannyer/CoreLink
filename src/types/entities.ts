// Tipos para las entidades del sistema de gestión de operaciones turísticas

// ============================================
// RESERVATION (Reserva)
// ============================================
export type PaymentMethod = 
  | 'cuenta_por_cobrar' 
  | 'efectivo' 
  | 'tarjeta' 
  | 'transferencia_bancaria';

export type ReservationClassification = 'niños' | 'adultos';

export type ReservationStatus = 
  | 'pendiente' 
  | 'confirmada' 
  | 'cancelada' 
  | 'completada';

export interface Reservation {
  id: string;
  referenceNumber: string; // Número de referencia único
  clientName: string;
  agencyName: string;
  agencyCommissionPercentage?: number; // Porcentaje de comisión (0-100)
  activityId: string;
  activityName?: string; // Para mostrar en listas
  schedule: string; // Horario (formato HH:mm)
  date: string; // Fecha (formato ISO)
  classification: ReservationClassification;
  participantsCount: number; // Total de participantes
  childrenCount?: number;
  adultsCount?: number;
  includesTransport: boolean;
  pickupPointId?: string;
  pickupPointName?: string;
  pickupTime?: string; // Horario de recogida
  notes?: string;
  paymentMethod: PaymentMethod;
  hasCommission: boolean;
  commissionAmount?: number;
  status: ReservationStatus;
  assignedGuides?: GuideAssignment[];
  vehicleId?: string;
  vehicleName?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================
// ACTIVITY (Actividad Turística)
// ============================================
export interface Activity {
  id: string;
  activityTypeId: string;
  title: string;
  partySize: number;
  status: boolean; // true = activa, false = inactiva
  activityTypeName?: string;
  schedulesCount?: number;
  schedules?: ActivitySchedule[]; // Planeaciones (fechas/horarios)
  guides?: any[]; // Guías asignados
  languages?: any[]; // Idiomas
}

// ============================================
// GUIDE (Guía)
// ============================================
export interface Guide {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isLeader: boolean; // Guía Líder o Normal
  maxPartySize?: number; // Máximo de personas que puede guiar
  status: 'activo' | 'inactivo';
  assignments?: GuideAssignment[]; // Asignaciones actuales
  createdAt: string;
  updatedAt: string;
}

// ============================================
// GUIDE ASSIGNMENT (Asignación de Guía)
// ============================================
export interface GuideAssignment {
  id: string;
  reservationId: string;
  guideId: string;
  guideName?: string;
  date: string; // Fecha de la asignación
  isLeader: boolean;
  assignedBy?: string; // Usuario que hizo la asignación
  assignedAt: string;
  notes?: string;
}

// ============================================
// VEHICLE (Unidad de Transporte)
// ============================================
export type VehicleStatus = 'activo' | 'fuera_de_circulacion' | 'mantenimiento';

export interface Vehicle {
  id: string;
  model: string;
  brand?: string;
  capacity: number; // Capacidad de pasajeros
  licensePlate: string;
  year?: number;
  status: VehicleStatus;
  lastMaintenance?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PICKUP POINT (Punto de Recogida)
// ============================================
export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  description?: string;
  availableTimes: string[]; // Horarios disponibles (formato HH:mm)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ACTIVITY SCHEDULE (Planeación/Fecha de Actividad)
// ============================================
export interface ActivitySchedule {
  id: string;
  activityId: string;
  scheduledStart: string; // ISO datetime
  scheduledEnd: string; // ISO datetime
  status: boolean; // true = activa, false = inactiva
  activityTitle?: string; // Para mostrar en listas
}

// ============================================
// SCHEDULE (Horario) - Mantener para compatibilidad
// ============================================
export type DayOfWeek = 
  | 'lunes' 
  | 'martes' 
  | 'miercoles' 
  | 'jueves' 
  | 'viernes' 
  | 'sabado' 
  | 'domingo';

export interface Schedule {
  id: string;
  activityId: string;
  activityName?: string;
  time: string; // Horario (formato HH:mm)
  dayOfWeek?: DayOfWeek; // Para horarios recurrentes
  date?: string; // Para horarios específicos
  isActive: boolean;
  capacity?: number; // Capacidad específica para este horario
  createdAt: string;
  updatedAt: string;
}

// ============================================
// REPORT (Reporte)
// ============================================
export interface ReservationReport {
  date: string;
  totalReservations: number;
  totalClients: number;
  totalRevenue?: number;
  reservations: Reservation[];
}

export interface CommissionReport {
  agencyName: string;
  totalReservations: number;
  totalCommission: number;
  period: {
    start: string;
    end: string;
  };
  reservations: Reservation[];
}

export interface DailyReport {
  date: string;
  reservations: Reservation[];
  activities: {
    activityId: string;
    activityName: string;
    count: number;
  }[];
  guides: {
    guideId: string;
    guideName: string;
    assignmentsCount: number;
  }[];
  vehicles: {
    vehicleId: string;
    vehicleName: string;
    assignmentsCount: number;
  }[];
}

// ============================================
// FILTERS (Filtros)
// ============================================
export interface ReservationFilters {
  referenceNumber?: string;
  clientName?: string;
  agencyName?: string;
  activityId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: ReservationStatus;
  paymentMethod?: PaymentMethod;
  hasCommission?: boolean;
  includesTransport?: boolean;
}

export interface ActivityFilters {
  name?: string;
  status?: 'activa' | 'inactiva';
}

export interface GuideFilters {
  name?: string;
  isLeader?: boolean;
  status?: 'activo' | 'inactivo';
}

export interface VehicleFilters {
  model?: string;
  status?: VehicleStatus;
}

// ============================================
// TRANSPORT (Transporte)
// ============================================
export interface Transport {
  id: string;
  model: string;
  capacity: number; // Capacidad de pasajeros
  operationalStatus: boolean; // Estado operacional
  status: boolean; // Estado general (activo/inactivo)
  createdAt: string;
  updatedAt: string;
}

export interface TransportFilters {
  model?: string;
  operationalStatus?: boolean;
  status?: boolean;
}

// ============================================
// FORM DATA (Datos de Formularios)
// ============================================
export interface ReservationFormData {
  clientName: string;
  agencyName: string;
  agencyCommissionPercentage?: number;
  activityId: string;
  schedule: string;
  date: string;
  classification: ReservationClassification;
  participantsCount: number;
  childrenCount?: number;
  adultsCount?: number;
  includesTransport: boolean;
  pickupPointId?: string;
  pickupTime?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  hasCommission: boolean;
}

export interface ActivityFormData {
  activityTypeId: string;
  title: string;
  partySize: number;
  status?: boolean; // true = activa, false = inactiva
}

export interface ActivityScheduleFormData {
  scheduledStart: string; // ISO datetime
  scheduledEnd: string; // ISO datetime
  status?: boolean; // true = activa, false = inactiva
}

export interface GuideFormData {
  name: string;
  email?: string;
  phone?: string;
  isLeader: boolean;
  maxPartySize?: number;
  status: 'activo' | 'inactivo';
}

export interface VehicleFormData {
  model: string;
  brand?: string;
  capacity: number;
  licensePlate: string;
  year?: number;
  status: VehicleStatus;
  lastMaintenance?: string;
  notes?: string;
}

export interface PickupPointFormData {
  name: string;
  address: string;
  description?: string;
  availableTimes: string[];
  isActive: boolean;
}

export interface TransportFormData {
  model: string;
  capacity: number;
  operationalStatus?: boolean;
  status?: boolean;
}

// ============================================
// ACTIVITY SCHEDULED (Actividad Programada/Evento)
// Diferente de Activity (tipo de actividad turística)
// ============================================
export interface ActivityScheduled {
  id: string;
  activityTypeId: string;
  activityTypeName?: string;
  title: string;
  partySize: number;
  start: string; // ISO datetime
  end: string; // ISO datetime
  languageIds?: string[];
  languages?: Array<{ id: string; name: string; code: string }>;
  assignments?: ActivityAssignment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityAssignment {
  id?: string;
  guideId: string;
  guideName?: string;
  isLeader: boolean;
  assignedAt?: string;
}

export interface ActivityListItem {
  id: string;
  activityTypeId: string;
  activityTypeName?: string;
  title: string;
  partySize: number;
  start: string;
  end: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityByDate extends ActivityScheduled {
  // Incluye toda la información completa de la actividad
}

export interface ActivityCreateRequest {
  activityTypeId: string;
  title: string;
  partySize: number;
  start?: string; // ISO datetime (opcional)
  end?: string; // ISO datetime (opcional)
  autoAssign?: boolean; // Si true, asigna guías automáticamente
  assignments?: ActivityAssignment[];
}

export interface ActivityCreateResponse extends ActivityScheduled {
  // Respuesta completa de la actividad creada
}

export interface ActivityUpdateRequest {
  activityTypeId?: string;
  title?: string;
  partySize?: number;
  start?: string; // ISO datetime (opcional)
  end?: string; // ISO datetime (opcional)
}

export interface AssignmentReplaceRequest {
  assignments: ActivityAssignment[];
}

// ============================================
// API RESPONSES
// ============================================
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

