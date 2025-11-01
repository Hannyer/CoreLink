// src/services/authService.ts
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL; // ← toma la URL según el ambiente

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: any; // tipa si tienes el modelo
}

// axios instance (reutilizable)
const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Si ya hay token guardado, lo añadimos al iniciar
const existingToken = localStorage.getItem("token");
if (existingToken) {
  api.defaults.headers.common.Authorization = `Bearer ${existingToken}`;
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  console.log(API_BASE)
  const { data } = await api.post<LoginResponse>("/api/auth/login", payload);
  // guarda sesión
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  // setea header para siguientes requests
  api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  delete api.defaults.headers.common.Authorization;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("token");
}

export function getCurrentUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export default api; 
