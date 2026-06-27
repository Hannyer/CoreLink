import { useEffect, useState } from "react";
import { CalendarCheck, Clock, Loader2, Users } from "lucide-react";
import { fetchMyGuideAssignments, type MyGuideAssignment } from "@/services/bookingAssignmentsService";
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

export default function MyGuideAssignmentsPage() {
  const toast = useToastContext();
  const [items, setItems] = useState<MyGuideAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyGuideAssignments()
      .then(setItems)
      .catch((error) => toast.error(error?.response?.data?.message || "Error al cargar actividades asignadas"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3">
        <CalendarCheck size={24} />
        <div>
          <h2 className="m-0">Mis actividades asignadas</h2>
          <small className="text-white-50">Salidas donde estás asignado como guía</small>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><Loader2 className="spin" /> Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-white-50 py-5">No tienes actividades asignadas próximas.</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {items.map((item) => (
            <div key={item.activityScheduleId} className="p-3 rounded-3" style={{ background: "rgba(15,23,42,.65)", border: "1px solid rgba(255,255,255,.08)" }}>
              <h5 className="mb-2">{item.activityTitle}</h5>
              <div className="d-flex flex-wrap gap-3 text-white-50 small">
                <span><Clock size={14} className="me-1" />{formatDateTime(item.scheduledStart)} - {formatDateTime(item.scheduledEnd)}</span>
                <span><Users size={14} className="me-1" />{item.totalPeople || 0} persona(s) · {item.bookingCount || 0} reserva(s)</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
