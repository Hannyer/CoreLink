import api from "@/api/apiClient";
import type {
  Vehicle,
  VehicleFormData,
  VehicleFilters,
  PaginatedResponse,
} from "@/types/entities";

// ============================================
// CRUD de Unidades de Transporte
// ============================================

export async function fetchVehicles(
  filters?: VehicleFilters & { page?: number; pageSize?: number }
): Promise<PaginatedResponse<Vehicle>> {
  const { data } = await api.post<PaginatedResponse<Vehicle>>("/api/vehicles/list", filters || {});
  return data;
}

export async function getAllVehicles(): Promise<Vehicle[]> {
  const { data } = await api.get<Vehicle[]>("/api/vehicles");
  return data;
}

export async function getVehicle(id: string): Promise<Vehicle> {
  const { data } = await api.get<Vehicle>(`/api/vehicles/${id}`);
  return data;
}

export async function createVehicle(payload: VehicleFormData): Promise<Vehicle> {
  const { data } = await api.post<Vehicle>("/api/vehicles", payload);
  return data;
}

export async function updateVehicle(id: string, payload: Partial<VehicleFormData>): Promise<Vehicle> {
  const { data } = await api.put<Vehicle>(`/api/vehicles/${id}`, payload);
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  await api.delete(`/api/vehicles/${id}`);
}

// ============================================
// Disponibilidad de Unidades
// ============================================

export interface VehicleAvailability {
  vehicleId: string;
  vehicleName: string;
  capacity: number;
  isAvailable: boolean;
  currentAssignments: number;
  status: string;
}

export async function getVehiclesAvailability(date: string): Promise<VehicleAvailability[]> {
  const { data } = await api.get<VehicleAvailability[]>(`/api/vehicles/availability/${date}`);
  return data;
}

export async function getAvailableVehicles(date: string, requiredCapacity?: number): Promise<Vehicle[]> {
  const { data } = await api.get<Vehicle[]>("/api/vehicles/available", {
    params: { date, requiredCapacity },
  });
  return data;
}

