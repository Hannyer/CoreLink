// src/api/auth.ts
import api from "./apiClient";

export function setAuthToken(token: string) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete api.defaults.headers.common.Authorization;
}

// Al iniciar la app, si hay token persistido, recargarlo:
export function bootstrapAuthFromStorage() {
  const t = localStorage.getItem("token");
  if (t) setAuthToken(t);
}
