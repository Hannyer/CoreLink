import axios from "axios";

const API_URL = "http://localhost:5102/api/login"; // cambia el puerto si es necesario

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: any; 
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  try {
    const res = await axios.post<LoginResponse>(`${API_URL}/login`, data, {
      headers: { "Content-Type": "application/json" }
    });
    return res.data;
  } catch (err: any) {
    throw err;
  }
}

export function logout() {
  localStorage.removeItem("token");
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("token");
}
