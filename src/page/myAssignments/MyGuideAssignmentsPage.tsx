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

function toDatetimeLocal(value: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function getTodayDateRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    startDateTime: toDatetimeLocal(start),
    endDateTime: toDatetimeLocal(end),
  };
}

function toIsoOrUndefined(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export default function MyGuideAssignmentsPage() {
  const toast = useToastContext();
  const [items, setItems] = useState<MyGuideAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(getTodayDateRange);

  useEffect(() => {
    setLoading(true);
    fetchMyGuideAssignments({
      startDateTime: toIsoOrUndefined(filters.startDateTime),
      endDateTime: toIsoOrUndefined(filters.endDateTime),
    })
      .then(setItems)
      .catch((error) => toast.error(error?.response?.data?.message || "Error al cargar actividades asignadas"))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3">
        <CalendarCheck size={24} />
        <div>
          <h2 className="m-0">Mis actividades asignadas</h2>
          <small className="text-white-50">Salidas donde estás asignado como guía</small>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6 col-lg-4">
          <label className="form-label text-white-50 small">Inicio</label>
          <input
            type="datetime-local"
            className="form-control"
            value={filters.startDateTime}
            onChange={(event) => setFilters((current) => ({ ...current, startDateTime: event.target.value }))}
          />
        </div>
        <div className="col-12 col-md-6 col-lg-4">
          <label className="form-label text-white-50 small">Fin</label>
          <input
            type="datetime-local"
            className="form-control"
            value={filters.endDateTime}
            onChange={(event) => setFilters((current) => ({ ...current, endDateTime: event.target.value }))}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><Loader2 className="spin" /> Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-white-50 py-5">No tienes actividades asignadas en el rango seleccionado.</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {items.map((item) => (
            <div key={item.activityScheduleId} className="assignment-card p-3 rounded-3">
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
