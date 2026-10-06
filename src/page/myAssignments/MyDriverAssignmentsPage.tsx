import { useEffect, useMemo, useRef, useState } from "react";
import { BusFront, CalendarPlus, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, Loader2, MapPin, Phone, RefreshCw, Users, X } from "lucide-react";
import {
  fetchMyDriverAssignments,
  fetchMyDriverCalendarLink,
  regenerateMyDriverCalendarLink,
  type CalendarSubscription,
  type MyDriverAssignment,
} from "@/services/bookingAssignmentsService";
import { useToastContext } from "@/contexts/ToastContext";
import { capitalizeFirst } from "@/utils/dateUtils";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function dateKey(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function yearRange(year: number) {
  return {
    startDateTime: new Date(year, 0, 1, 0, 0, 0, 0).toISOString(),
    endDateTime: new Date(year + 1, 0, 1, 0, 0, 0, 0).toISOString(),
  };
}

function buildGrid(viewDate: Date) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, i) =>
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
  );
}

function formatHour(value?: string) {
  return value
    ? new Date(value).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })
    : "-";
}

/** Fecha/hora que ordena y ubica el traslado: la recogida si existe, si no el inicio. */
function tripDate(item: MyDriverAssignment) {
  return new Date(item.pickupAt || item.scheduledStart);
}

/** Un traslado es "pasado" cuando su hora de fin ya ocurrió. */
function isPast(item: MyDriverAssignment, now: Date) {
  return !!item.scheduledEnd && new Date(item.scheduledEnd).getTime() < now.getTime();
}

export default function MyDriverAssignmentsPage() {
  const toast = useToastContext();
  const [items, setItems] = useState<MyDriverAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const pickerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncData, setSyncData] = useState<CalendarSubscription | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const viewYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  useEffect(() => {
    const { startDateTime, endDateTime } = yearRange(viewYear);
    setLoading(true);
    fetchMyDriverAssignments({ startDateTime, endDateTime })
      .then(setItems)
      .catch((error) => toast.error(error?.response?.data?.message || "Error al cargar traslados asignados"))
      .finally(() => setLoading(false));
  }, [viewYear]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setPickerOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPickerOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const closeSheet = () => {
    setSelectedDay(null);
    setSelectedBookingId(null);
  };

  useEffect(() => {
    if (!selectedDay) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeSheet(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedDay]);

  // Al seleccionar un traslado, la sección de datos arranca desplegada.
  useEffect(() => { if (selectedBookingId) setDetailsOpen(true); }, [selectedBookingId]);

  // Cierra el modal de sincronización con Escape.
  useEffect(() => {
    if (!syncOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSyncOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [syncOpen]);

  const openSync = () => {
    setSyncOpen(true);
    if (!syncData) {
      setSyncLoading(true);
      fetchMyDriverCalendarLink()
        .then(setSyncData)
        .catch((error) => toast.error(error?.response?.data?.message || "No se pudo obtener el enlace de calendario"))
        .finally(() => setSyncLoading(false));
    }
  };

  const copyLink = async () => {
    if (!syncData) return;
    try {
      await navigator.clipboard.writeText(syncData.feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Copia el enlace manualmente.");
    }
  };

  const regenerate = () => {
    if (!window.confirm("¿Regenerar el enlace? El enlace anterior dejará de funcionar y tendrás que volver a suscribirte en tu calendario.")) return;
    setRegenerating(true);
    regenerateMyDriverCalendarLink()
      .then((data) => { setSyncData(data); setCopied(false); toast.success("Enlace regenerado"); })
      .catch((error) => toast.error(error?.response?.data?.message || "No se pudo regenerar el enlace"))
      .finally(() => setRegenerating(false));
  };

  const onSheetTouchStart = (event: React.TouchEvent) => { dragStartY.current = event.touches[0].clientY; };
  const onSheetTouchMove = (event: React.TouchEvent) => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const dy = event.touches[0].clientY - dragStartY.current;
    if (dy > 0) sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onSheetTouchEnd = (event: React.TouchEvent) => {
    if (dragStartY.current === null || !sheetRef.current) return;
    const dy = event.changedTouches[0].clientY - dragStartY.current;
    sheetRef.current.style.transform = "";
    dragStartY.current = null;
    if (dy > 90) closeSheet();
  };

  // Agrupa los traslados por día local (según hora de recogida o inicio).
  const byDay = useMemo(() => {
    const map = new Map<string, MyDriverAssignment[]>();
    for (const item of items) {
      const key = dateKey(tripDate(item));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => tripDate(a).getTime() - tripDate(b).getTime());
    }
    return map;
  }, [items]);

  const monthsWithTrips = useMemo(() => {
    const set = new Set<number>();
    for (const item of items) set.add(tripDate(item).getMonth());
    return set;
  }, [items]);

  const grid = useMemo(() => buildGrid(viewDate), [viewDate]);
  const now = new Date();
  const todayKey = dateKey(now);

  const dayTrips = selectedDay ? byDay.get(selectedDay) ?? [] : [];
  const selected = dayTrips.find((t) => t.bookingId === selectedBookingId) ?? null;

  const goToMonth = (year: number, month: number) => {
    setViewDate(new Date(year, month, 1));
    setSelectedDay(null);
    setSelectedBookingId(null);
  };
  const changeMonth = (delta: number) => goToMonth(viewYear, currentMonth + delta);
  const goToday = () => { const n = new Date(); goToMonth(n.getFullYear(), n.getMonth()); };
  const openPicker = () => { setPickerYear(viewYear); setPickerOpen((open) => !open); };

  const monthTitle = capitalizeFirst(viewDate.toLocaleDateString("es-CR", { month: "long", year: "numeric" }));

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3">
        <BusFront size={24} />
        <div>
          <h2 className="m-0">Mis traslados asignados</h2>
          <small className="text-white-50">Reservaciones donde estás asignado como conductor</small>
        </div>
        <button type="button" className="cal-sync-btn ms-auto" onClick={openSync}>
          <CalendarPlus size={16} />
          <span className="d-none d-sm-inline">Sincronizar con mi calendario</span>
          <span className="d-sm-none">Sincronizar</span>
        </button>
      </div>

      <div className="cal-toolbar">
        <button type="button" className="cal-nav-btn" onClick={() => changeMonth(-1)} aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>

        <div className="cal-monthpick" ref={pickerRef}>
          <button type="button" className="cal-title-btn" onClick={openPicker} aria-expanded={pickerOpen} aria-haspopup="true">
            {monthTitle}
            <ChevronDown size={16} className="chev" />
          </button>

          {pickerOpen && (
            <div className="cal-pop" role="dialog" aria-label="Seleccionar mes y año">
              <div className="cal-pop-year">
                <button type="button" className="cal-pop-yr-btn" onClick={() => setPickerYear((y) => y - 1)} aria-label="Año anterior">
                  <ChevronLeft size={16} />
                </button>
                <span className="cal-pop-year-label">{pickerYear}</span>
                <button type="button" className="cal-pop-yr-btn" onClick={() => setPickerYear((y) => y + 1)} aria-label="Año siguiente">
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="cal-pop-grid">
                {MONTHS.map((label, index) => {
                  const isActive = pickerYear === viewYear && index === currentMonth;
                  const hasTrips = pickerYear === viewYear && monthsWithTrips.has(index);
                  const classes = [
                    "cal-pop-month",
                    isActive ? "cal-pop-month--active" : "",
                    hasTrips ? "cal-pop-month--has" : "",
                  ].filter(Boolean).join(" ");
                  return (
                    <button key={label} type="button" className={classes} onClick={() => { goToMonth(pickerYear, index); setPickerOpen(false); }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button type="button" className="cal-nav-btn" onClick={() => changeMonth(1)} aria-label="Mes siguiente">
          <ChevronRight size={18} />
        </button>

        <button type="button" className="cal-today-btn ms-auto" onClick={goToday}>Hoy</button>
      </div>

      {loading ? (
        <div className="text-center py-5"><Loader2 className="spin" /> Cargando...</div>
      ) : (
        <>
          <div className="cal-grid mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="cal-dow">{day}</div>
            ))}
          </div>
          <div className="cal-grid">
            {grid.map((date) => {
              const key = dateKey(date);
              const trips = byDay.get(key) ?? [];
              const hasTrips = trips.length > 0;
              const allPast = hasTrips && trips.every((t) => isPast(t, now));
              const classes = [
                "cal-cell",
                date.getMonth() !== currentMonth ? "cal-cell--other" : "",
                key === todayKey ? "cal-cell--today" : "",
                hasTrips ? "cal-cell--has" : "",
                key === selectedDay ? "cal-cell--selected" : "",
              ].filter(Boolean).join(" ");
              return (
                <div
                  key={key}
                  className={classes}
                  onClick={() => {
                    if (!hasTrips) return;
                    setSelectedDay(key);
                    setSelectedBookingId(trips.length === 1 ? trips[0].bookingId : null);
                  }}
                >
                  <span className="cal-daynum">{date.getDate()}</span>
                  {hasTrips && (
                    <span className={`cal-badge ${allPast ? "cal-badge--past" : ""}`}>
                      <BusFront size={11} />
                      {trips.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {byDay.size === 0 && (
            <div className="text-center text-white-50 py-5">
              No tienes traslados asignados en {viewYear}.
            </div>
          )}
        </>
      )}

      {selectedDay && (
        <div className="cal-sheet-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeSheet(); }}>
          <div className="cal-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-label="Detalle del día">
            <div className="cal-sheet-top" onTouchStart={onSheetTouchStart} onTouchMove={onSheetTouchMove} onTouchEnd={onSheetTouchEnd}>
              <div className="cal-sheet-handle" />
              <div className="cal-sheet-head">
                <h3 className="cal-sheet-title">
                  <Clock size={16} />
                  {capitalizeFirst(new Date(`${selectedDay}T00:00:00`).toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" }))}
                </h3>
                <button type="button" className="cal-sheet-close" onClick={closeSheet} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="cal-sheet-body">
              <div className="d-flex flex-column gap-2">
                {dayTrips.map((t) => (
                  <div
                    key={t.bookingId}
                    className={[
                      "cal-hour-card",
                      t.bookingId === selectedBookingId ? "cal-hour-card--selected" : "",
                      isPast(t, now) ? "cal-hour-card--past" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => setSelectedBookingId(t.bookingId)}
                  >
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <span className="cal-hour-time">
                        <Clock size={14} className="me-1" />
                        {t.pickupAt ? `Recoge ${formatHour(t.pickupAt)}` : formatHour(t.scheduledStart)}
                      </span>
                      <span className="text-muted small">{t.customerName}</span>
                    </div>
                  </div>
                ))}
              </div>

              {selected && (
                <div className="cal-detail">
                  <div className="cal-detail-head">
                    <h4 className="cal-detail-title">{selected.activityTitle}</h4>
                    {isPast(selected, now) ? (
                      <span className="cal-status cal-status--past">Finalizado</span>
                    ) : (
                      <span className="cal-status cal-status--upcoming">Próximo</span>
                    )}
                  </div>
                  <div className="cal-detail-grid">
                    <div className="cal-detail-item">
                      <span className="cal-detail-label">Actividad</span>
                      <span className="cal-detail-value">
                        {formatHour(selected.scheduledStart)} - {formatHour(selected.scheduledEnd)}
                      </span>
                    </div>
                    {selected.pickupAt && (
                      <div className="cal-detail-item">
                        <span className="cal-detail-label">Recogida</span>
                        <span className="cal-detail-value"><Clock size={14} className="me-1" />{formatHour(selected.pickupAt)}</span>
                      </div>
                    )}
                    <div className="cal-detail-item">
                      <span className="cal-detail-label">Personas</span>
                      <span className="cal-detail-value"><Users size={14} className="me-1" />{selected.numberOfPeople || 0}</span>
                    </div>
                  </div>

                  <div className="cal-bookings">
                    <button
                      type="button"
                      className="cal-bookings-toggle"
                      onClick={() => setDetailsOpen((open) => !open)}
                      aria-expanded={detailsOpen}
                    >
                      <Users size={13} />
                      Datos del traslado
                      <ChevronDown size={16} className="chev" />
                    </button>

                    {detailsOpen && (
                      <div className="mt-2">
                        <div className="cal-booking-row">
                          <div className="cal-booking-main">
                            <span className="cal-booking-name">{selected.customerName}</span>
                            {selected.customerPhone && (
                              <span className="cal-booking-sub"><Phone size={12} className="me-1" />{selected.customerPhone}</span>
                            )}
                          </div>
                          <div className="cal-booking-right">
                            <span className={`cal-chip ${selected.status === "confirmed" ? "cal-chip--confirmed" : selected.status === "pending" ? "cal-chip--pending" : ""}`}>
                              {selected.status === "confirmed" ? "Confirmada" : selected.status === "pending" ? "Pendiente" : selected.status}
                            </span>
                          </div>
                        </div>
                        <div className="cal-booking-row">
                          <div className="cal-booking-main">
                            <span className="cal-booking-sub"><BusFront size={12} className="me-1" />Vehículo</span>
                            <span className="cal-booking-name">{selected.model} · {selected.licensePlate}</span>
                            <span className="cal-booking-sub">Capacidad {selected.capacity}</span>
                          </div>
                        </div>
                        {selected.referencePointDescription && (
                          <div className="cal-booking-row">
                            <div className="cal-booking-main">
                              <span className="cal-booking-sub"><MapPin size={12} className="me-1" />Punto de recogida</span>
                              <span className="cal-booking-name">{selected.referencePointDescription}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {syncOpen && (
        <div className="cal-sheet-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setSyncOpen(false); }}>
          <div className="cal-sheet" role="dialog" aria-modal="true" aria-label="Sincronizar con mi calendario">
            <div className="cal-sheet-top">
              <div className="cal-sheet-handle" />
              <div className="cal-sheet-head">
                <h3 className="cal-sheet-title">
                  <CalendarPlus size={16} />
                  Sincronizar con mi calendario
                </h3>
                <button type="button" className="cal-sheet-close" onClick={() => setSyncOpen(false)} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="cal-sheet-body">
              <p className="cal-sync-intro">
                Suscribe tus traslados al calendario de tu celular. Se actualizan solos cuando cambian tus asignaciones.
              </p>

              {syncLoading ? (
                <div className="cal-bookings-empty"><Loader2 size={14} className="spin me-1" /> Generando tu enlace...</div>
              ) : !syncData ? (
                <div className="cal-bookings-empty">No se pudo obtener el enlace. Intenta de nuevo.</div>
              ) : (
                <>
                  <a className="cal-sync-primary" href={syncData.webcalUrl}>
                    <CalendarPlus size={18} />
                    Agregar a mi calendario
                  </a>

                  <div className="cal-sync-or">o copia el enlace</div>
                  <div className="cal-sync-urlrow">
                    <input className="cal-sync-url" readOnly value={syncData.feedUrl} onFocus={(e) => e.target.select()} />
                    <button type="button" className={`cal-sync-copy ${copied ? "cal-sync-copy--done" : ""}`} onClick={copyLink}>
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? "Copiado" : "Copiar"}
                    </button>
                  </div>

                  <div className="cal-sync-steps">
                    <h5>iPhone (Calendario)</h5>
                    <p>Toca «Agregar a mi calendario» y confirma la suscripción. O ve a Ajustes → Calendario → Cuentas → Agregar cuenta → Otra → Agregar calendario suscrito, y pega el enlace.</p>
                    <h5>Google Calendar</h5>
                    <p>En la computadora: Otros calendarios → Desde una URL → pega el enlace. En el celular se ve una vez suscrito desde la web.</p>
                    <p className="cal-sync-note">La actualización no es instantánea: Apple refresca cada ~15 min–1 h y Google puede tardar varias horas. Para ver cambios al momento, usa el calendario dentro de la app.</p>
                  </div>

                  <div className="cal-sync-regen">
                    <span className="cal-sync-note">¿Compartiste el enlace por error? Regenéralo para invalidar el anterior.</span>
                    <button type="button" className="cal-sync-regen-btn" onClick={regenerate} disabled={regenerating}>
                      {regenerating ? <Loader2 size={13} className="spin me-1" /> : <RefreshCw size={13} className="me-1" />}
                      Regenerar enlace
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
