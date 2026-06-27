import { useEffect, useState, useCallback } from "react";
import {
  ClipboardCheck,
  Users,
  BusFront,
  CheckCircle2,
  Clock,
  ChevronRight,
  UserCheck,
  AlertCircle,
  CalendarCheck,
  Edit3,
  RefreshCw,
  Search,
  Loader2,
} from "lucide-react";
import { fetchBookingsWithPagination } from "@/services/bookingsService";
import {
  getBookingAssignments,
  assignTransportToBooking,
  confirmBooking,
  fetchScheduleGuideAssignments,
  fetchAvailableGuidesBySchedule,
  assignGuidesToSchedule,
  fetchBookingTransportAssignments,
  fetchAvailableDrivers,
  type AvailableGuide,
  type AvailableDriver,
  type ScheduleGuideAssignment,
  type BookingTransportAssignment,
} from "@/services/bookingAssignmentsService";
import { fetchAvailableTransportsWithPagination } from "@/services/transportService";
import { useToastContext } from "@/contexts/ToastContext";
import type { Booking, BookingAssignments, Transport } from "@/types/entities";
import type { AxiosError } from "axios";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const MAX_GUIDES = 5;

function getApiError(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message || axiosError?.message || "Ha ocurrido un error inesperado";
}

// ─── Badge de estado ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: "Pendiente",  cls: "badge-pending" },
    confirmed: { label: "Confirmada", cls: "badge-confirmed" },
    cancelled: { label: "Cancelada",  cls: "badge-cancelled" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "badge bg-secondary" };
  return <span className={`op-badge ${cls}`}>{label}</span>;
}

// ─── Tarjeta de reserva en el listado ────────────────────────────────────────
function BookingCard({
  booking,
  selected,
  onClick,
}: {
  booking: Booking;
  selected: boolean;
  onClick: () => void;
}) {
  const date = booking.scheduledStart
    ? new Date(booking.scheduledStart).toLocaleDateString("es-CR", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : "—";
  const time = booking.scheduledStart
    ? new Date(booking.scheduledStart).toLocaleTimeString("es-CR", {
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <div
      className={`op-booking-card ${selected ? "op-booking-card--selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="d-flex justify-content-between align-items-start mb-1">
        <span className="op-activity-name fw-semibold">{booking.activityTitle || "Actividad"}</span>
        <StatusBadge status={booking.status} />
      </div>
      <div className="d-flex gap-3 op-meta">
        <span><Clock size={13} className="me-1" />{date}{time ? ` · ${time}` : ""}</span>
        <span><Users size={13} className="me-1" />{booking.numberOfPeople} personas</span>
      </div>
      <div className="op-customer-name mt-1">{booking.customerName}</div>
      {booking.transport && (
        <span className="op-transport-badge mt-1">
          <BusFront size={12} className="me-1" />Requiere transporte
        </span>
      )}
      <ChevronRight size={16} className="op-chevron" />
    </div>
  );
}

function GuideAssignmentsSubmodule({ mode }: { mode: "assign" | "edit" }) {
  const toast = useToastContext();
  const [items, setItems] = useState<ScheduleGuideAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ScheduleGuideAssignment | null>(null);
  const [availableGuides, setAvailableGuides] = useState<AvailableGuide[]>([]);
  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);
  const [guideSearch, setGuideSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingGuides, setLoadingGuides] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchScheduleGuideAssignments());
    } catch (e) {
      toast.error("Error al cargar salidas con guías: " + getApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openEdit = async (item: ScheduleGuideAssignment) => {
    setEditing(item);
    setSelectedGuideIds(item.guides.map((g) => g.id));
    setGuideSearch("");
    setLoadingGuides(true);
    try {
      const guides = await fetchAvailableGuidesBySchedule(item.activityScheduleId);
      setAvailableGuides(guides);
    } catch (e) {
      toast.error("Error al cargar guías disponibles: " + getApiError(e));
      setAvailableGuides([]);
    } finally {
      setLoadingGuides(false);
    }
  };

  const toggleGuide = (id: string) => {
    setSelectedGuideIds((prev) => {
      if (prev.includes(id)) return prev.filter((guideId) => guideId !== id);
      if (prev.length >= MAX_GUIDES) {
        toast.error(`Máximo ${MAX_GUIDES} guías por salida`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await assignGuidesToSchedule(editing.activityScheduleId, selectedGuideIds);
      setItems(updated);
      toast.success("Guías de la salida actualizados correctamente");
      setEditing(null);
    } catch (e) {
      toast.error(getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (value: string) =>
    value
      ? new Date(value).toLocaleString("es-CR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const visibleItems = items.filter((item) =>
    mode === "assign" ? item.guides.length === 0 : item.guides.length > 0
  );
  const isAssignMode = mode === "assign";
  const filteredGuides = availableGuides.filter((guide) =>
    guide.fullName.toLowerCase().includes(guideSearch.trim().toLowerCase())
  );

  return (
    <div className="op-panel" style={{ minHeight: "calc(100vh - 260px)" }}>
      <div className="op-panel-header d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <div>
          <div className="op-panel-title d-flex align-items-center gap-2">
            <CalendarCheck size={18} /> {isAssignMode ? "Asignar guías a actividades programadas" : "Modificar guías asignados"}
          </div>
          <div className="op-panel-meta">
            {isAssignMode
              ? "Selecciona salidas pendientes de guía y asigna el equipo correspondiente."
              : "Consulta las actividades programadas que ya tienen guías y modifica sus asignaciones."}
          </div>
        </div>
        <button className="op-btn-refresh" onClick={loadItems} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Actualizar
        </button>
      </div>

      <div className="op-panel-body">
        {loading ? (
          <div className="op-empty-panel">
            <Loader2 className="spin" size={28} />
            <span>Cargando salidas...</span>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="op-empty-panel">
            <CalendarCheck size={42} />
            <span>{isAssignMode ? "No hay salidas pendientes de guías" : "No hay salidas con guías asignados"}</span>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {visibleItems.map((item) => (
              <div key={item.activityScheduleId} className="op-section-card">
                <div className="d-flex justify-content-between gap-3 flex-wrap">
                  <div>
                    <div className="fw-semibold" style={{ color: "#e2e8f0" }}>
                      {item.activityTitle}
                    </div>
                    <div className="op-panel-meta">
                      {formatDateTime(item.scheduledStart)} - {formatDateTime(item.scheduledEnd)}
                    </div>
                    <div className="op-panel-meta">
                      {item.bookingCount} reserva(s) · {item.totalPeople} persona(s)
                    </div>
                  </div>
                  <button className="op-btn-save" onClick={() => openEdit(item)}>
                    <Edit3 size={14} /> {isAssignMode ? "Asignar guías" : "Modificar guías"}
                  </button>
                </div>

                {item.guides.length > 0 ? (
                  <div className="op-chips mt-3 mb-0">
                    {item.guides.map((guide) => (
                      <div key={guide.id} className="op-guide-chip">
                        <UserCheck size={14} />
                        <span>{guide.fullName}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="op-warn-strip mt-3">
                    <AlertCircle size={14} /> Sin guías asignados
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!editing}
        onClose={() => {
          setEditing(null);
          setGuideSearch("");
        }}
        title={isAssignMode ? "Asignar guías a la salida" : "Modificar guías de la salida"}
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setEditing(null);
                setGuideSearch("");
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={selectedGuideIds.length === 0}>
              Guardar cambios
            </Button>
          </>
        }
      >
        {editing && (
          <div>
            <div className="mb-3">
              <div className="fw-semibold">{editing.activityTitle}</div>
              <div className="text-muted small">
                {formatDateTime(editing.scheduledStart)} - {formatDateTime(editing.scheduledEnd)}
              </div>
            </div>

            {loadingGuides ? (
              <div className="d-flex align-items-center gap-2 text-muted">
                <Loader2 className="spin" size={18} /> Cargando guías disponibles...
              </div>
            ) : (
              <>
                <div className="position-relative mb-3">
                  <Search
                    size={15}
                    className="position-absolute"
                    style={{ left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    style={{ paddingLeft: "2.25rem" }}
                    placeholder="Buscar guía por nombre..."
                    value={guideSearch}
                    onChange={(e) => setGuideSearch(e.target.value)}
                  />
                </div>

                <div className="d-flex flex-column gap-2" style={{ maxHeight: 360, overflowY: "auto" }}>
                  {filteredGuides.length === 0 ? (
                    <div className="text-muted small text-center py-3">
                      No hay guías que coincidan con la búsqueda.
                    </div>
                  ) : (
                    filteredGuides.map((guide) => {
                      const selected = selectedGuideIds.includes(guide.id);
                      const disabled = !selected && selectedGuideIds.length >= MAX_GUIDES;
                      return (
                        <button
                          key={guide.id}
                          type="button"
                          className="btn text-start d-flex justify-content-between align-items-center"
                          style={{
                            border: selected ? "1px solid #6366f1" : "1px solid #e2e8f0",
                            background: selected ? "#eef2ff" : "#fff",
                            opacity: disabled ? 0.55 : 1,
                          }}
                          disabled={disabled}
                          onClick={() => toggleGuide(guide.id)}
                        >
                          <span>{guide.fullName}</span>
                          {selected && <CheckCircle2 size={18} color="#4f46e5" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function TransportAssignmentsSubmodule() {
  const toast = useToastContext();
  const [items, setItems] = useState<BookingTransportAssignment[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [drivers, setDrivers] = useState<AvailableDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BookingTransportAssignment | null>(null);
  const [selectedTransportId, setSelectedTransportId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const [assigned, available, availableDrivers] = await Promise.all([
        fetchBookingTransportAssignments(),
        fetchAvailableTransportsWithPagination(1, 100),
        fetchAvailableDrivers(),
      ]);
      setItems(assigned);
      setTransports(available.items);
      setDrivers(availableDrivers);
    } catch (e) {
      toast.error("Error al cargar transportes asignados: " + getApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openEdit = (item: BookingTransportAssignment) => {
    setEditing(item);
    setSelectedTransportId(item.transportId);
    setSelectedDriverId(item.driverId || "");
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await assignTransportToBooking(editing.bookingId, selectedTransportId || null, selectedDriverId || null);
      toast.success("Transporte de la reservación actualizado correctamente");
      setEditing(null);
      await loadItems();
    } catch (e) {
      toast.error(getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (value: string) =>
    value
      ? new Date(value).toLocaleString("es-CR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  return (
    <div className="op-panel" style={{ minHeight: "calc(100vh - 260px)" }}>
      <div className="op-panel-header d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <div>
          <div className="op-panel-title d-flex align-items-center gap-2">
            <BusFront size={18} /> Reservaciones con transporte asignado
          </div>
          <div className="op-panel-meta">
            Consulta y modifica el transporte asignado a cada reservación.
          </div>
        </div>
        <button className="op-btn-refresh" onClick={loadItems} disabled={loading}>
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Actualizar
        </button>
      </div>

      <div className="op-panel-body">
        {loading ? (
          <div className="op-empty-panel">
            <Loader2 className="spin" size={28} />
            <span>Cargando reservaciones...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="op-empty-panel">
            <BusFront size={42} />
            <span>No hay reservaciones con transporte asignado</span>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {items.map((item) => (
              <div key={item.bookingId} className="op-section-card">
                <div className="d-flex justify-content-between gap-3 flex-wrap">
                  <div>
                    <div className="fw-semibold" style={{ color: "#e2e8f0" }}>
                      {item.activityTitle}
                    </div>
                    <div className="op-panel-meta">{formatDateTime(item.scheduledStart)}</div>
                    <div className="op-panel-meta">
                      {item.customerName} · {item.numberOfPeople} persona(s)
                    </div>
                    <div className="op-info-strip mt-2">
                      <BusFront size={13} /> {item.model} · {item.licensePlate} · Cap. {item.capacity}
                    </div>
                    <div className="op-panel-meta mt-1">
                      Conductor: {item.driverName || "Sin conductor asignado"}
                    </div>
                  </div>
                  <button className="op-btn-save" onClick={() => openEdit(item)}>
                    <Edit3 size={14} /> Modificar transporte
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Modificar transporte de la reservación"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} disabled={!selectedTransportId}>
              Guardar cambios
            </Button>
          </>
        }
      >
        {editing && (
          <div>
            <div className="mb-3">
              <div className="fw-semibold">{editing.activityTitle}</div>
              <div className="text-muted small">
                {editing.customerName} · {formatDateTime(editing.scheduledStart)}
              </div>
            </div>
            <select
              className="form-select"
              value={selectedTransportId}
              onChange={(e) => setSelectedTransportId(e.target.value)}
            >
              <option value="">Seleccionar transporte</option>
              {transports.map((transport) => (
                <option key={transport.id} value={transport.id}>
                  {transport.model} · {transport.licensePlate} · Cap. {transport.capacity}
                </option>
              ))}
            </select>
            <select
              className="form-select mt-3"
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
            >
              <option value="">Seleccionar conductor</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.fullName}
                </option>
              ))}
            </select>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function OperatorPage() {
  const toast = useToastContext();
  const [activeSubmodule, setActiveSubmodule] = useState<"guideAssign" | "assignments" | "guideDetails" | "transportDetails">("guideAssign");

  // Listado de reservas pendientes
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Panel de asignación
  const [assignments, setAssignments] = useState<BookingAssignments | null>(null);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Catálogos
  const [availableTransports, setAvailableTransports] = useState<Transport[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<AvailableDriver[]>([]);

  // Selecciones en el panel
  const [selectedTransportId, setSelectedTransportId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");

  // ── Cargar reservas pendientes ──
  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const result = await fetchBookingsWithPagination(1, 100, { status: "pending" });
      setBookings(result.items);
    } catch (e) {
      toast.error("Error al cargar las reservas: " + getApiError(e));
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  // ── Cargar catálogos generales ──
  const loadCatalogs = useCallback(async () => {
    try {
      const [transports, drivers] = await Promise.all([
        fetchAvailableTransportsWithPagination(1, 100),
        fetchAvailableDrivers(),
      ]);
      setAvailableTransports(transports.items);
      setAvailableDrivers(drivers);
    } catch (e) {
      toast.error("Error al cargar catálogos: " + getApiError(e));
    }
  }, []);

  useEffect(() => {
    loadBookings();
    loadCatalogs();
  }, [loadBookings, loadCatalogs]);

  // ── Seleccionar una reserva ──
  const handleSelectBooking = async (booking: Booking) => {
    setSelectedBooking(booking);
    setLoadingPanel(true);
    try {
      const current = await getBookingAssignments(booking.id);
      setAssignments(current);
      setSelectedTransportId(current.transport?.id || "");
      setSelectedDriverId(current.transport?.driverId || "");
    } catch (e) {
      toast.error("Error al cargar asignaciones: " + getApiError(e));
      setAssignments({ guides: [], transport: null });
    } finally {
      setLoadingPanel(false);
    }
  };

  // ── Confirmar reserva ──
  const handleConfirm = async () => {
    if (!selectedBooking) return;
    setConfirming(true);
    try {
      if (selectedBooking.transport) {
        await assignTransportToBooking(selectedBooking.id, selectedTransportId || null, selectedDriverId || null);
      }

      await confirmBooking(selectedBooking.id);
      toast.success("✅ Reserva confirmada exitosamente");
      setSelectedBooking(null);
      setAssignments(null);
      await loadBookings();
    } catch (e) {
      toast.error(getApiError(e));
    } finally {
      setConfirming(false);
    }
  };

  // ── Filtros ──
  const filteredBookings = bookings.filter((b) =>
    [b.customerName, b.activityTitle, b.companyName]
      .join(" ").toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // ── ¿Se puede confirmar? ──
  const canConfirm =
    selectedBooking &&
    (assignments?.guides.length ?? 0) > 0 &&
    (!selectedBooking.transport || (!!selectedTransportId && !!selectedDriverId));

  return (
    <>
      {/* ─── Estilos scoped ─────────────────────────────────────────── */}
      <style>{`
        .op-header { margin-bottom: 1.5rem; }
        .op-title { font-size: 1.5rem; font-weight: 700; color: #e2e8f0; display: flex; align-items: center; gap: .6rem; }
        .op-subtitle { color: #94a3b8; font-size: .875rem; margin-top: .2rem; }
        .op-tabs { display: inline-flex; gap: .4rem; padding: .25rem; border-radius: 10px; background: rgba(15,23,42,.65); border: 1px solid rgba(255,255,255,.08); }
        .op-tab { border: 0; border-radius: 8px; background: transparent; color: #94a3b8; padding: .45rem .8rem; font-size: .85rem; display: inline-flex; align-items: center; gap: .4rem; }
        .op-tab:hover { color: #e2e8f0; background: rgba(255,255,255,.06); }
        .op-tab--active { color: #fff; background: rgba(99,102,241,.35); }

        .op-layout { display: grid; grid-template-columns: 380px 1fr; gap: 1.25rem; height: calc(100vh - 220px); min-height: 500px; }
        @media (max-width: 900px) { .op-layout { grid-template-columns: 1fr; height: auto; } }

        /* Lista izquierda */
        .op-list-panel { display: flex; flex-direction: column; background: rgba(15,23,42,.6); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; overflow: hidden; }
        .op-list-header { padding: .75rem 1rem; border-bottom: 1px solid rgba(255,255,255,.08); display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
        .op-list-title { font-size: .8rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; }
        .op-search { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 8px; padding: .4rem .75rem; color: #e2e8f0; font-size: .85rem; width: 100%; }
        .op-search::placeholder { color: #64748b; }
        .op-search:focus { outline: none; border-color: rgba(99,102,241,.5); }
        .op-list-scroll { flex: 1; overflow-y: auto; padding: .5rem; display: flex; flex-direction: column; gap: .4rem; }
        .op-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #64748b; gap: .5rem; font-size: .875rem; }

        /* Tarjeta de reserva */
        .op-booking-card { position: relative; padding: .75rem 1rem; border-radius: 10px; border: 1px solid rgba(255,255,255,.07); background: rgba(30,41,59,.6); cursor: pointer; transition: all .18s ease; padding-right: 2rem; }
        .op-booking-card:hover { background: rgba(99,102,241,.12); border-color: rgba(99,102,241,.3); }
        .op-booking-card--selected { background: rgba(99,102,241,.2) !important; border-color: rgba(99,102,241,.5) !important; box-shadow: 0 0 0 2px rgba(99,102,241,.25); }
        .op-activity-name { font-size: .875rem; color: #e2e8f0; }
        .op-meta { font-size: .75rem; color: #94a3b8; }
        .op-customer-name { font-size: .8rem; color: #cbd5e1; }
        .op-transport-badge { display: inline-flex; align-items: center; font-size: .7rem; color: #38bdf8; background: rgba(56,189,248,.1); border: 1px solid rgba(56,189,248,.2); border-radius: 20px; padding: .1rem .5rem; }
        .op-chevron { position: absolute; right: .75rem; top: 50%; transform: translateY(-50%); color: #475569; }

        /* Badges de estado */
        .op-badge { display: inline-block; padding: .15rem .55rem; border-radius: 20px; font-size: .7rem; font-weight: 600; }
        .badge-pending   { background: rgba(245,158,11,.15); color: #fbbf24; border: 1px solid rgba(245,158,11,.3); }
        .badge-confirmed { background: rgba(16,185,129,.15); color: #34d399; border: 1px solid rgba(16,185,129,.3); }
        .badge-cancelled { background: rgba(239,68,68,.15);  color: #f87171; border: 1px solid rgba(239,68,68,.3);  }

        /* Panel derecho */
        .op-panel { display: flex; flex-direction: column; background: rgba(15,23,42,.6); border: 1px solid rgba(255,255,255,.08); border-radius: 12px; overflow: hidden; }
        .op-panel-header { padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,.08); }
        .op-panel-title { font-size: 1rem; font-weight: 600; color: #e2e8f0; }
        .op-panel-meta  { font-size: .8rem; color: #94a3b8; margin-top: .2rem; }
        .op-panel-body  { flex: 1; overflow-y: auto; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .op-empty-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: .75rem; color: #475569; text-align: center; }

        /* Secciones del panel */
        .op-section-title { font-size: .8rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .6rem; display: flex; align-items: center; gap: .4rem; }
        .op-section-card { background: rgba(30,41,59,.5); border: 1px solid rgba(255,255,255,.07); border-radius: 10px; padding: .85rem 1rem; }

        /* Chips de guías */
        .op-chips { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .6rem; min-height: 32px; }
        .op-guide-chip { display: inline-flex; align-items: center; gap: .35rem; background: rgba(99,102,241,.2); border: 1px solid rgba(99,102,241,.4); border-radius: 20px; padding: .25rem .65rem; font-size: .8rem; color: #a5b4fc; }
        .op-chip-remove { background: none; border: none; color: #818cf8; display: flex; align-items: center; cursor: pointer; padding: 0; transition: color .15s; }
        .op-chip-remove:hover { color: #f87171; }

        /* Lista de guías seleccionables */
        .op-guide-list { display: flex; flex-direction: column; gap: .3rem; max-height: 180px; overflow-y: auto; }
        .op-guide-item { display: flex; align-items: center; gap: .6rem; padding: .45rem .65rem; border-radius: 8px; cursor: pointer; font-size: .85rem; color: #cbd5e1; transition: background .15s; border: 1px solid transparent; }
        .op-guide-item:hover { background: rgba(255,255,255,.05); }
        .op-guide-item--selected { background: rgba(99,102,241,.12); border-color: rgba(99,102,241,.3); color: #a5b4fc; }
        .op-guide-item--disabled { opacity: .45; cursor: not-allowed; }
        .op-guide-check { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #475569; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .15s; }
        .op-guide-item--selected .op-guide-check { background: #6366f1; border-color: #6366f1; }
        .op-guide-lang { font-size: .68rem; color: #64748b; margin-left: auto; }

        /* Select de transporte */
        .op-transport-select { background: rgba(30,41,59,.8); border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: .5rem .75rem; color: #e2e8f0; font-size: .875rem; width: 100%; }
        .op-transport-select:focus { outline: none; border-color: rgba(99,102,241,.5); }
        .op-transport-select option { background: #1e293b; }

        /* Info strip */
        .op-info-strip { background: rgba(99,102,241,.08); border: 1px solid rgba(99,102,241,.2); border-radius: 8px; padding: .6rem .85rem; font-size: .8rem; color: #a5b4fc; display: flex; align-items: center; gap: .5rem; }
        .op-warn-strip { background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.2); border-radius: 8px; padding: .6rem .85rem; font-size: .8rem; color: #fbbf24; display: flex; align-items: center; gap: .5rem; }

        /* Footer del panel */
        .op-panel-footer { padding: 1rem 1.25rem; border-top: 1px solid rgba(255,255,255,.08); display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
        .op-btn-save { background: rgba(99,102,241,.2); border: 1px solid rgba(99,102,241,.4); color: #a5b4fc; border-radius: 8px; padding: .45rem .9rem; font-size: .85rem; cursor: pointer; display: inline-flex; align-items: center; gap: .4rem; transition: all .18s; }
        .op-btn-save:hover:not(:disabled) { background: rgba(99,102,241,.35); }
        .op-btn-save:disabled { opacity: .5; cursor: not-allowed; }
        .op-btn-confirm { background: linear-gradient(135deg, #059669, #10b981); border: none; color: #fff; border-radius: 8px; padding: .5rem 1.1rem; font-size: .9rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: .5rem; transition: all .18s; box-shadow: 0 2px 12px rgba(16,185,129,.3); margin-left: auto; }
        .op-btn-confirm:hover:not(:disabled) { box-shadow: 0 4px 20px rgba(16,185,129,.45); transform: translateY(-1px); }
        .op-btn-confirm:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }

        /* Refresh button */
        .op-btn-refresh { background: none; border: 1px solid rgba(255,255,255,.12); color: #94a3b8; border-radius: 8px; padding: .35rem .65rem; font-size: .8rem; cursor: pointer; display: inline-flex; align-items: center; gap: .3rem; transition: all .15s; }
        .op-btn-refresh:hover { border-color: rgba(255,255,255,.25); color: #e2e8f0; }

        .op-divider { border-color: rgba(255,255,255,.07); margin: .25rem 0; }
        .op-max-label { font-size: .75rem; color: #64748b; }
        .op-count-badge { display: inline-block; background: rgba(99,102,241,.3); color: #a5b4fc; border-radius: 20px; padding: .05rem .45rem; font-size: .72rem; font-weight: 600; margin-left: .3rem; }
      `}</style>

      {/* ─── Cabecera ───────────────────────────────────────────────── */}
      <div className="op-header">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <div className="op-title">
              <ClipboardCheck size={24} />
              Gestión de Operaciones
            </div>
            <div className="op-subtitle">
              Asigna guías por actividad programada, transporte por reservación y confirma reservas
            </div>
          </div>
          <button className="op-btn-refresh" onClick={loadBookings} disabled={loadingBookings}>
            <RefreshCw size={14} className={loadingBookings ? "spin" : ""} />
            Actualizar
          </button>
        </div>
        <div className="op-tabs mt-3">
          <button
            className={`op-tab ${activeSubmodule === "guideAssign" ? "op-tab--active" : ""}`}
            onClick={() => setActiveSubmodule("guideAssign")}
          >
            <CalendarCheck size={15} /> Guías a actividades
          </button>
          <button
            className={`op-tab ${activeSubmodule === "assignments" ? "op-tab--active" : ""}`}
            onClick={() => setActiveSubmodule("assignments")}
          >
            <ClipboardCheck size={15} /> Asignaciones
          </button>
          <button
            className={`op-tab ${activeSubmodule === "guideDetails" ? "op-tab--active" : ""}`}
            onClick={() => setActiveSubmodule("guideDetails")}
          >
            <CalendarCheck size={15} /> Modificar guías
          </button>
          <button
            className={`op-tab ${activeSubmodule === "transportDetails" ? "op-tab--active" : ""}`}
            onClick={() => setActiveSubmodule("transportDetails")}
          >
            <BusFront size={15} /> Modificar transportes
          </button>
        </div>
      </div>

      {/* ─── Layout principal ────────────────────────────────────────── */}
      {activeSubmodule === "guideAssign" ? (
        <GuideAssignmentsSubmodule mode="assign" />
      ) : activeSubmodule === "guideDetails" ? (
        <GuideAssignmentsSubmodule mode="edit" />
      ) : activeSubmodule === "transportDetails" ? (
        <TransportAssignmentsSubmodule />
      ) : (
      <div className="op-layout">
        {/* ─── Panel izquierdo: lista de reservas ─── */}
        <div className="op-list-panel">
          <div className="op-list-header">
            <span className="op-list-title">
              Reservas Pendientes
              <span className="op-count-badge">{filteredBookings.length}</span>
            </span>
            <button
              className="op-btn-refresh"
              onClick={loadBookings}
              disabled={loadingBookings}
              title="Refrescar lista"
            >
              <RefreshCw size={13} className={loadingBookings ? "spin" : ""} />
            </button>
          </div>

          {/* Barra de búsqueda */}
          <div className="px-2 pt-2 pb-1">
            <div className="position-relative">
              <Search size={14} className="position-absolute" style={{ left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input
                type="text"
                className="op-search"
                style={{ paddingLeft: "2rem" }}
                placeholder="Buscar cliente, actividad…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="op-list-scroll">
            {loadingBookings ? (
              <div className="op-empty">
                <Loader2 size={28} className="spin" />
                <span>Cargando reservas…</span>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="op-empty">
                <CheckCircle2 size={36} style={{ color: "#34d399" }} />
                <span>No hay reservas pendientes</span>
                <small>Todas las reservas están al día</small>
              </div>
            ) : (
              filteredBookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  selected={selectedBooking?.id === b.id}
                  onClick={() => handleSelectBooking(b)}
                />
              ))
            )}
          </div>
        </div>

        {/* ─── Panel derecho: asignación ─── */}
        <div className="op-panel">
          {!selectedBooking ? (
            <div className="op-empty-panel">
              <ClipboardCheck size={48} style={{ color: "#334155" }} />
              <div style={{ color: "#64748b", fontSize: ".9rem" }}>
                Selecciona una reserva para gestionar su asignación
              </div>
            </div>
          ) : loadingPanel ? (
            <div className="op-empty-panel">
              <Loader2 size={32} className="spin" style={{ color: "#6366f1" }} />
              <span style={{ color: "#64748b" }}>Cargando asignaciones…</span>
            </div>
          ) : (
            <>
              {/* Cabecera del panel */}
              <div className="op-panel-header">
                <div className="d-flex align-items-start justify-content-between gap-2">
                  <div>
                    <div className="op-panel-title">{selectedBooking.activityTitle}</div>
                    <div className="op-panel-meta d-flex flex-wrap gap-3 mt-1">
                      <span>
                        <Clock size={13} className="me-1" />
                        {selectedBooking.scheduledStart
                          ? new Date(selectedBooking.scheduledStart).toLocaleString("es-CR", {
                              day: "2-digit", month: "long", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : "—"}
                      </span>
                      <span><Users size={13} className="me-1" />{selectedBooking.numberOfPeople} personas</span>
                      <span>👤 {selectedBooking.customerName}</span>
                    </div>
                  </div>
                  <StatusBadge status={selectedBooking.status} />
                </div>

                {/* Info strips */}
                <div className="mt-2 d-flex flex-column gap-1">
                  <div className="op-info-strip">
                    <Users size={14} />
                    Los guías se asignan por salida en el submódulo Guías por salida. Actualmente: <strong>{assignments?.guides.length ?? 0}</strong> guía{(assignments?.guides.length ?? 0) !== 1 ? "s" : ""}
                  </div>
                  {selectedBooking.transport && !selectedTransportId && (
                    <div className="op-warn-strip">
                      <AlertCircle size={14} />
                      Esta reserva requiere transporte. Debes asignar un vehículo.
                    </div>
                  )}
                  {selectedBooking.transport && !selectedDriverId && (
                    <div className="op-warn-strip">
                      <AlertCircle size={14} />
                      Esta reserva requiere transporte. Debes asignar un conductor.
                    </div>
                  )}
                </div>
              </div>

              <div className="op-panel-body">
                {/* ── Sección Guías ── */}
                <div>
                  <div className="op-section-title">
                    <UserCheck size={15} /> Guías de la salida
                  </div>
                  <div className="op-section-card">
                    {assignments?.guides.length ? (
                      <div className="op-chips">
                        {assignments.guides.map((guide) => (
                          <div key={guide.id} className="op-guide-chip">
                            <UserCheck size={14} />
                            <span>{guide.fullName}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="op-warn-strip">
                        <AlertCircle size={14} /> Esta salida todavía no tiene guías asignados.
                      </div>
                      )}

                    <div className="op-info-strip mt-2">
                      <UserCheck size={13} />
                      Para modificar guías usa el submódulo Guías por salida.
                    </div>
                  </div>
                </div>

                {/* ── Sección Transporte (solo si la reserva lo requiere) ── */}
                {selectedBooking.transport && (
                  <div>
                    <div className="op-section-title">
                      <BusFront size={15} /> Transporte Asignado
                    </div>
                    <div className="op-section-card">
                      <select
                        className="op-transport-select mb-2"
                        value={selectedTransportId}
                        onChange={(e) => setSelectedTransportId(e.target.value)}
                      >
                        <option value="">— Seleccionar vehículo —</option>
                        {availableTransports.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.model} · {t.licensePlate} · Cap. {t.capacity}
                          </option>
                        ))}
                      </select>

                      <select
                        className="op-transport-select mb-2"
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                      >
                        <option value="">— Seleccionar conductor —</option>
                        {availableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.fullName}
                          </option>
                        ))}
                      </select>

                      {selectedTransportId && (
                        <div className="op-info-strip mb-2">
                          <BusFront size={13} />
                          {availableTransports.find((t) => t.id === selectedTransportId)?.model} seleccionado
                        </div>
                      )}

                      <div className="op-info-strip">
                        <BusFront size={13} />
                        El vehículo y conductor seleccionados se guardarán al confirmar la reserva.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Footer: botón Confirmar ── */}
              <div className="op-panel-footer">
                <div className="d-flex flex-column" style={{ fontSize: ".78rem", color: "#64748b" }}>
                  {(assignments?.guides.length ?? 0) === 0 && (
                    <span className="d-flex align-items-center gap-1">
                      <AlertCircle size={12} color="#fbbf24" /> Asigna al menos 1 guía a la salida
                    </span>
                  )}
                  {selectedBooking.transport && !selectedTransportId && (
                    <span className="d-flex align-items-center gap-1">
                      <AlertCircle size={12} color="#fbbf24" /> Asigna un vehículo de transporte
                    </span>
                  )}
                  {selectedBooking.transport && !selectedDriverId && (
                    <span className="d-flex align-items-center gap-1">
                      <AlertCircle size={12} color="#fbbf24" /> Asigna un conductor
                    </span>
                  )}
                </div>

                <button
                  className="op-btn-confirm"
                  onClick={handleConfirm}
                  disabled={!canConfirm || confirming}
                >
                  {confirming ? (
                    <><Loader2 size={16} className="spin" /> Confirmando…</>
                  ) : (
                    <><CheckCircle2 size={16} /> Confirmar Reserva</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      )}

      {/* Animación spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .8s linear infinite; }
      `}</style>
    </>
  );
}
