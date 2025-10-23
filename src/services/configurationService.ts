import axios from "axios";

const API_URL = "http://localhost:5102/api/login";

export type Configuration = {
  pkConfiguration: number;
  estado: number | null;
  description: string | null;
  observacion: string | null;
  key01: string | null;
  key02: string | null;
  key03: string | null;
  key04: string | null;
  key05: string | null;
  key06: string | null;
  value: string | null;
  displayName: string | null;
};

export type ConfigFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: keyof Configuration | string;
  order?: "asc" | "desc";
};

export async function fetchConfigurations(body: ConfigFilters) {
  const res = await axios.post<{ items: Configuration[]; total: number }>(`${API_URL}/ListSettings`, body, {
    headers: { "Content-Type": "application/json" }
  });
  return res.data;
}
export async function createConfiguration(payload: Omit<Configuration, "pkConfiguration">) {
  const res = await axios.post<Configuration>(`${API_URL}`, payload, {
    headers: { "Content-Type": "application/json" }
  });
  return res.data;
}

export async function updateConfiguration(id: number, payload: Partial<Omit<Configuration, "pkConfiguration">>) {
  const res = await axios.put<Configuration>(`${API_URL}/${id}`, payload, {
    headers: { "Content-Type": "application/json" }
  });
  return res.data;
}

export async function deleteConfiguration(id: number) {
  await axios.delete(`${API_URL}/${id}`);
}
