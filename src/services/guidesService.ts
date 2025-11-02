// src/services/guidesService.ts
import api from "@/api/apiClient";

export interface Guide {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: boolean;
  isLeader: boolean;
  maxPartySize: number | null;
}


type GuidesApiResponse =
  | { items: any[] }              
  | any[];  
export async function fetchGuides(): Promise<Guide[]> {
 const { data } = await api.get<GuidesApiResponse>("/api/guides");
  console.log("RESPUESTA BACKEND /api/guides:", data);

   const list = Array.isArray((data as any)?.items)
    ? (data as any).items
    : Array.isArray(data)
    ? (data as any)
    : [];

  if (!Array.isArray(list)) {
    throw new Error("La API no está devolviendo un array en /api/guides");
  }

  return list.map((g) => ({
    id: g.id,
    name: g.name,
    email: g.email ?? null,
    phone: g.phone ?? null,
    status: !!g.status,
    isLeader: !!g.is_leader,
    maxPartySize: g.max_party_size ?? null,
  }));
}
