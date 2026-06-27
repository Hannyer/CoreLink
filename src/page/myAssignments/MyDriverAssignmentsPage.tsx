import { useEffect, useState } from "react";
import { BusFront, Clock, Loader2, Users } from "lucide-react";
import { fetchMyDriverAssignments, type MyDriverAssignment } from "@/services/bookingAssignmentsService";
import { useToastContext } from "@/contexts/ToastContext";

function formatDateTime(value: string) {
  return value
    ? new Date(value).toLocaleString("es-CR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
}

export default function MyDriverAssignmentsPage() {
  const toast = useToastContext();
  const [items, setItems] = useState<MyDriverAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyDriverAssignments()
      .then(setItems)
      .catch((error) => toast.error(error?.response?.data?.message || "Error al cargar transportes asignados"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3">
        <BusFront size={24} />
        <div>
          <h2 className="m-0">Mis traslados asignados</h2>
          <small className="text-white-50">Reservaciones donde estás asignado como conductor</small>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><Loader2 className="spin" /> Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-white-50 py-5">No tienes traslados asignados próximos.</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {items.map((item) => (
            <div key={item.bookingId} className="p-3 rounded-3" style={{ background: "rgba(15,23,42,.65)", border: "1px solid rgba(255,255,255,.08)" }}>
              <h5 className="mb-2">{item.activityTitle}</h5>
              <div className="d-flex flex-wrap gap-3 text-white-50 small mb-2">
                <span><Clock size={14} className="me-1" />{formatDateTime(item.scheduledStart)} - {formatDateTime(item.scheduledEnd)}</span>
                <span><Users size={14} className="me-1" />{item.numberOfPeople} persona(s)</span>
              </div>
              <div className="small text-white-50">Cliente: {item.customerName} {item.customerPhone ? `· ${item.customerPhone}` : ""}</div>
              <div className="small text-white-50">Vehículo: {item.model} · {item.licensePlate} · Cap. {item.capacity}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
