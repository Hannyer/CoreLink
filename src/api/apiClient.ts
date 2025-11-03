// src/api/apiClient.ts
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Interceptor de respuesta: si 401 ⇒ limpiar y mandar a login
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      if (window.location.pathname === "/login") {
        return Promise.reject(err);
      }
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
