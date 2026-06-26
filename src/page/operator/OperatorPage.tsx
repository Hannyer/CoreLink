import { useEffect, useState, useCallback } from "react";
import {
  ClipboardCheck,
  Users,
  BusFront,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Search,
  Loader2,
} from "lucide-react";
import { fetchBookingsWithPagination } from "@/services/bookingsService";
import {
  fetchAvailableGuides,
  getBookingAssignments,
  assignGuidesToBooking,
  assignTransportToBooking,
  confirmBooking,
  type AvailableGuide,
} from "@/services/bookingAssignmentsService";
import { fetchAvailableTransportsWithPagination } from "@/services/transportService";
import { useToastContext } from "@/contexts/ToastContext";
import type { Booking, BookingAssignments, Transport } from "@/types/entities";
import type { AxiosError } from "axios";

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

// ─── Chip de guía seleccionado ────────────────────────────────────────────────
function GuideChip({ guide, onRemove }: { guide: AvailableGuide; onRemove: () => void }) {
  return (
    <div className="op-guide-chip">
      <UserCheck size={14} />
      <span>{guide.fullName}</span>
      <button className="op-chip-remove" onClick={onRemove} title="Quitar guía">
        <X size={12} />
      </button>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function OperatorPage() {
  const toast = useToastContext();

  // Listado de reservas pendientes
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Panel de asignación
  const [assignments, setAssignments] = useState<BookingAssignments | null>(null);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [savingGuides, setSavingGuides] = useState(false);
  const [savingTransport, setSavingTransport] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Catálogos
  const [availableGuides, setAvailableGuides] = useState<AvailableGuide[]>([]);
  const [availableTransports, setAvailableTransports] = useState<Transport[]>([]);

  // Selecciones en el panel
  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);
  const [selectedTransportId, setSelectedTransportId] = useState<string>("");
  const [guideSearch, setGuideSearch] = useState("");

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

  // ── Cargar catálogos (guías y transportes disponibles) ──
  const loadCatalogs = useCallback(async () => {
    try {
      const [guides, transports] = await Promise.all([
        fetchAvailableGuides(),
        fetchAvailableTransportsWithPagination(1, 200),
      ]);
      setAvailableGuides(guides);
      setAvailableTransports(transports.items);
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
    setGuideSearch("");
    try {
      const current = await getBookingAssignments(booking.id);
      setAssignments(current);
      setSelectedGuideIds(current.guides.map((g) => g.id));
      setSelectedTransportId(current.transport?.id || "");
    } catch (e) {
      toast.error("Error al cargar asignaciones: " + getApiError(e));
      setAssignments({ guides: [], transport: null });
    } finally {
      setLoadingPanel(false);
    }
  };

  // ── Guardar guías ──
  const handleSaveGuides = async () => {
    if (!selectedBooking) return;
    setSavingGuides(true);
    try {
      const updated = await assignGuidesToBooking(selectedBooking.id, selectedGuideIds);
      setAssignments(updated);
      toast.success("Guías asignados correctamente");
    } catch (e) {
      toast.error(getApiError(e));
    } finally {
      setSavingGuides(false);
    }
  };

  // ── Guardar transporte ──
  const handleSaveTransport = async () => {
    if (!selectedBooking) return;
    setSavingTransport(true);
    try {
      const updated = await assignTransportToBooking(
        selectedBooking.id,
        selectedTransportId || null
      );
      setAssignments(updated);
      toast.success("Transporte asignado correctamente");
    } catch (e) {
      toast.error(getApiError(e));
    } finally {
      setSavingTransport(false);
    }
  };

  // ── Confirmar reserva ──
  const handleConfirm = async () => {
    if (!selectedBooking) return;
    setConfirming(true);
    try {
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

  // ── Agregar / quitar guía de selección ──
  const toggleGuide = (id: string) => {
    setSelectedGuideIds((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id);
      if (prev.length >= MAX_GUIDES) {
        toast.error(`Máximo ${MAX_GUIDES} guías por reserva`);
        return prev;
      }
      return [...prev, id];
    });
  };

  // ── Filtros ──
  const filteredBookings = bookings.filter((b) =>
    [b.customerName, b.activityTitle, b.companyName]
      .join(" ").toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredGuides = availableGuides.filter((g) =>
    g.fullName.toLowerCase().includes(guideSearch.toLowerCase())
  );

  // ── ¿Se puede confirmar? ──
  const canConfirm =
    selectedBooking &&
    selectedGuideIds.length > 0 &&
    (!selectedBooking.transport || !!selectedTransportId);

  // ── Guía seleccionado como objeto ──
  const selectedGuides = availableGuides.filter((g) => selectedGuideIds.includes(g.id));

  return (
    <>
      {/* ─── Estilos scoped ─────────────────────────────────────────── */}
      <style>{`
        .op-header { margin-bottom: 1.5rem; }
        .op-title { font-size: 1.5rem; font-weight: 700; color: #e2e8f0; display: flex; align-items: center; gap: .6rem; }
        .op-subtitle { color: #94a3b8; font-size: .875rem; margin-top: .2rem; }

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
              Gestión Operativa
            </div>
            <div className="op-subtitle">
              Asigna guías y transporte a las reservas pendientes para confirmarlas
            </div>
          </div>
          <button className="op-btn-refresh" onClick={loadBookings} disabled={loadingBookings}>
            <RefreshCw size={14} className={loadingBookings ? "spin" : ""} />
            Actualizar
          </button>
        </div>
      </div>

      {/* ─── Layout principal ────────────────────────────────────────── */}
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
                    Asigna de 1 a {MAX_GUIDES} guías. Actualmente: <strong>{selectedGuideIds.length}</strong> seleccionado{selectedGuideIds.length !== 1 ? "s" : ""}
                  </div>
                  {selectedBooking.transport && !selectedTransportId && (
                    <div className="op-warn-strip">
                      <AlertCircle size={14} />
                      Esta reserva requiere transporte. Debes asignar un vehículo.
                    </div>
                  )}
                </div>
              </div>

              <div className="op-panel-body">
                {/* ── Sección Guías ── */}
                <div>
                  <div className="op-section-title">
                    <UserCheck size={15} /> Guías Asignados
                    <span className="op-max-label ms-auto">Máx. {MAX_GUIDES}</span>
                  </div>
                  <div className="op-section-card">
                    {/* Chips de seleccionados */}
                    {selectedGuides.length > 0 && (
                      <div className="op-chips">
                        {selectedGuides.map((g) => (
                          <GuideChip
                            key={g.id}
                            guide={g}
                            onRemove={() => toggleGuide(g.id)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Buscador de guías */}
                    <div className="position-relative mb-2">
                      <Search
                        size={13}
                        className="position-absolute"
                        style={{ left: 8, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}
                      />
                      <input
                        type="text"
                        className="op-search"
                        style={{ paddingLeft: "1.75rem", fontSize: ".8rem", padding: ".35rem .65rem .35rem 1.75rem" }}
                        placeholder="Buscar guía…"
                        value={guideSearch}
                        onChange={(e) => setGuideSearch(e.target.value)}
                      />
                    </div>

                    {/* Lista de guías disponibles */}
                    <div className="op-guide-list">
                      {filteredGuides.length === 0 ? (
                        <div className="op-empty" style={{ minHeight: 60 }}>
                          <span>No hay guías disponibles</span>
                        </div>
                      ) : (
                        filteredGuides.map((g) => {
                          const isSelected = selectedGuideIds.includes(g.id);
                          const isDisabled = !isSelected && selectedGuideIds.length >= MAX_GUIDES;
                          const langs = g.languages?.map((l) => l.code).join(", ") || "";
                          return (
                            <div
                              key={g.id}
                              className={`op-guide-item ${isSelected ? "op-guide-item--selected" : ""} ${isDisabled ? "op-guide-item--disabled" : ""}`}
                              onClick={() => !isDisabled && toggleGuide(g.id)}
                              role="checkbox"
                              aria-checked={isSelected}
                              tabIndex={0}
                              onKeyDown={(e) => e.key === " " && !isDisabled && toggleGuide(g.id)}
                            >
                              <div className="op-guide-check">
                                {isSelected && <CheckCircle2 size={10} color="#fff" />}
                              </div>
                              <span>{g.fullName}</span>
                              {g.speaksEnglish && (
                                <span className="op-guide-lang">🇬🇧 EN</span>
                              )}
                              {langs && !g.speaksEnglish && (
                                <span className="op-guide-lang">{langs}</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Botón guardar guías */}
                    <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,.07)" }}>
                      <button
                        className="op-btn-save"
                        onClick={handleSaveGuides}
                        disabled={savingGuides}
                      >
                        {savingGuides ? <Loader2 size={14} className="spin" /> : <UserCheck size={14} />}
                        {savingGuides ? "Guardando…" : "Guardar guías"}
                      </button>
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

                      {selectedTransportId && (
                        <div className="op-info-strip mb-2">
                          <BusFront size={13} />
                          {availableTransports.find((t) => t.id === selectedTransportId)?.model} seleccionado
                        </div>
                      )}

                      <button
                        className="op-btn-save"
                        onClick={handleSaveTransport}
                        disabled={savingTransport}
                      >
                        {savingTransport ? <Loader2 size={14} className="spin" /> : <BusFront size={14} />}
                        {savingTransport ? "Guardando…" : "Guardar transporte"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Footer: botón Confirmar ── */}
              <div className="op-panel-footer">
                <div className="d-flex flex-column" style={{ fontSize: ".78rem", color: "#64748b" }}>
                  {selectedGuideIds.length === 0 && (
                    <span className="d-flex align-items-center gap-1">
                      <AlertCircle size={12} color="#fbbf24" /> Asigna al menos 1 guía
                    </span>
                  )}
                  {selectedBooking.transport && !selectedTransportId && (
                    <span className="d-flex align-items-center gap-1">
                      <AlertCircle size={12} color="#fbbf24" /> Asigna un vehículo de transporte
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

      {/* Animación spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin .8s linear infinite; }
      `}</style>
    </>
  );
}
