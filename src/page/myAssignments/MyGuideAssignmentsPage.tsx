import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, CalendarPlus, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, Loader2, Phone, RefreshCw, Users, X } from "lucide-react";
import {
  fetchMyGuideAssignments,
  fetchMyGuideScheduleBookings,
  fetchMyCalendarLink,
  regenerateMyCalendarLink,
  type CalendarSubscription,
  type MyGuideAssignment,
  type ScheduleBooking,
} from "@/services/bookingAssignmentsService";
import { useToastContext } from "@/contexts/ToastContext";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Clave local YYYY-MM-DD a partir de una fecha (sin corrimiento por zona horaria). */
function dateKey(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Rango [1 ene, 1 ene del año siguiente) en ISO, para cargar todo el año de una vez. */
function yearRange(year: number) {
  return {
    startDateTime: new Date(year, 0, 1, 0, 0, 0, 0).toISOString(),
    endDateTime: new Date(year + 1, 0, 1, 0, 0, 0, 0).toISOString(),
  };
}

/** 42 celdas (6 semanas) empezando en lunes, para pintar la cuadrícula del mes. */
function buildGrid(viewDate: Date) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7; // getDay(): 0=domingo -> lunes=0
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, i) =>
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
  );
}

function formatHour(value: string) {
  return value
    ? new Date(value).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })
    : "-";
}

/** Una salida es "pasada" cuando su hora de fin ya ocurrió. */
function isPast(slot: MyGuideAssignment, now: Date) {
  return !!slot.scheduledEnd && new Date(slot.scheduledEnd).getTime() < now.getTime();
}

/** Desglose legible de una reserva: "3 adultos · 2 niños · 1 sénior · 1 infante". */
function breakdown(b: ScheduleBooking) {
  const parts: string[] = [];
  if (b.adultCount) parts.push(`${b.adultCount} ${b.adultCount === 1 ? "adulto" : "adultos"}`);
  if (b.childCount) parts.push(`${b.childCount} ${b.childCount === 1 ? "niño" : "niños"}`);
  if (b.seniorCount) parts.push(`${b.seniorCount} ${b.seniorCount === 1 ? "sénior" : "séniors"}`);
  if (b.infantCount) parts.push(`${b.infantCount} ${b.infantCount === 1 ? "infante" : "infantes"}`);
  return parts.join(" · ");
}

export default function MyGuideAssignmentsPage() {
  const toast = useToastContext();
  const [items, setItems] = useState<MyGuideAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const pickerRef = useRef<HTMLDivElement>(null);
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsOpen, setBookingsOpen] = useState(true);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncData, setSyncData] = useState<CalendarSubscription | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const viewYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Carga el año completo. Solo se vuelve a consultar cuando cambia el año.
  useEffect(() => {
    const { startDateTime, endDateTime } = yearRange(viewYear);
    setLoading(true);
    fetchMyGuideAssignments({ startDateTime, endDateTime })
      .then(setItems)
      .catch((error) => toast.error(error?.response?.data?.message || "Error al cargar actividades asignadas"))
      .finally(() => setLoading(false));
  }, [viewYear]);

  // Cierra el selector al hacer click fuera o con Escape.
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

  // Carga las reservas de la salida seleccionada.
  useEffect(() => {
    if (!selectedScheduleId) {
      setBookings([]);
      return;
    }
    let cancelled = false;
    setBookingsLoading(true);
    fetchMyGuideScheduleBookings(selectedScheduleId)
      .then((data) => { if (!cancelled) setBookings(data); })
      .catch((error) => {
        if (!cancelled) {
          setBookings([]);
          toast.error(error?.response?.data?.message || "Error al cargar las reservas de la salida");
        }
      })
      .finally(() => { if (!cancelled) setBookingsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedScheduleId]);

  // Agrupa las asignaciones por día local: { "2027-03-01": [asignación, ...] }
  const byDay = useMemo(() => {
    const map = new Map<string, MyGuideAssignment[]>();
    for (const item of items) {
      if (!item.scheduledStart) continue;
      const key = dateKey(new Date(item.scheduledStart));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    }
    return map;
  }, [items]);

  // Meses (0-11) del año cargado que tienen al menos una salida.
  const monthsWithSlots = useMemo(() => {
    const set = new Set<number>();
    for (const item of items) {
      if (item.scheduledStart) set.add(new Date(item.scheduledStart).getMonth());
    }
    return set;
  }, [items]);

  const grid = useMemo(() => buildGrid(viewDate), [viewDate]);
  const now = new Date();
  const todayKey = dateKey(now);

  const closeSheet = () => {
    setSelectedDay(null);
    setSelectedScheduleId(null);
  };

  // Cierra la hoja con Escape y bloquea el scroll del fondo mientras está abierta.
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

  // Al abrir una salida, la lista de reservas arranca desplegada.
  useEffect(() => { if (selectedScheduleId) setBookingsOpen(true); }, [selectedScheduleId]);

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
      fetchMyCalendarLink()
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
    regenerateMyCalendarLink()
      .then((data) => { setSyncData(data); setCopied(false); toast.success("Enlace regenerado"); })
      .catch((error) => toast.error(error?.response?.data?.message || "No se pudo regenerar el enlace"))
      .finally(() => setRegenerating(false));
  };

  // Swipe-down para cerrar (solo el gesto sobre el encabezado de la hoja).
  const onSheetTouchStart = (event: React.TouchEvent) => {
    dragStartY.current = event.touches[0].clientY;
  };
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

  const daySlots = selectedDay ? byDay.get(selectedDay) ?? [] : [];
  const selected = daySlots.find((slot) => slot.activityScheduleId === selectedScheduleId) ?? null;

  const goToMonth = (year: number, month: number) => {
    setViewDate(new Date(year, month, 1));
    setSelectedDay(null);
    setSelectedScheduleId(null);
  };

  const changeMonth = (delta: number) => goToMonth(viewYear, currentMonth + delta);

  const goToday = () => {
    const now = new Date();
    goToMonth(now.getFullYear(), now.getMonth());
  };

  const openPicker = () => {
    setPickerYear(viewYear);
    setPickerOpen((open) => !open);
  };

  const monthTitle = viewDate.toLocaleDateString("es-CR", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="d-flex align-items-center gap-2 mb-3">
        <CalendarCheck size={24} />
        <div>
          <h2 className="m-0">Mis actividades asignadas</h2>
          <small className="text-white-50">Salidas donde estás asignado como guía</small>
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
          <button
            type="button"
            className="cal-title-btn"
            onClick={openPicker}
            aria-expanded={pickerOpen}
            aria-haspopup="true"
          >
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
                  // El punto de "tiene salidas" solo aplica al año cargado.
                  const hasSlots = pickerYear === viewYear && monthsWithSlots.has(index);
                  const classes = [
                    "cal-pop-month",
                    isActive ? "cal-pop-month--active" : "",
                    hasSlots ? "cal-pop-month--has" : "",
                  ].filter(Boolean).join(" ");
                  return (
                    <button
                      key={label}
                      type="button"
                      className={classes}
                      onClick={() => { goToMonth(pickerYear, index); setPickerOpen(false); }}
                    >
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
              const slots = byDay.get(key) ?? [];
              const hasSlots = slots.length > 0;
              // El día se marca en gris solo si TODAS sus salidas ya pasaron.
              const allPast = hasSlots && slots.every((slot) => isPast(slot, now));
              const classes = [
                "cal-cell",
                date.getMonth() !== currentMonth ? "cal-cell--other" : "",
                key === todayKey ? "cal-cell--today" : "",
                hasSlots ? "cal-cell--has" : "",
                key === selectedDay ? "cal-cell--selected" : "",
              ].filter(Boolean).join(" ");
              return (
                <div
                  key={key}
                  className={classes}
                  onClick={() => {
                    if (!hasSlots) return;
                    setSelectedDay(key);
                    setSelectedScheduleId(slots.length === 1 ? slots[0].activityScheduleId : null);
                  }}
                >
                  <span className="cal-daynum">{date.getDate()}</span>
                  {hasSlots && (
                    <span className={`cal-badge ${allPast ? "cal-badge--past" : ""}`}>
                      <CalendarCheck size={11} />
                      {slots.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {byDay.size === 0 && (
            <div className="text-center text-white-50 py-5">
              No tienes actividades asignadas en {viewYear}.
            </div>
          )}
        </>
      )}

      {selectedDay && (
        <div className="cal-sheet-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeSheet(); }}>
          <div className="cal-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-label="Detalle del día">
            <div
              className="cal-sheet-top"
              onTouchStart={onSheetTouchStart}
              onTouchMove={onSheetTouchMove}
              onTouchEnd={onSheetTouchEnd}
            >
              <div className="cal-sheet-handle" />
              <div className="cal-sheet-head">
                <h3 className="cal-sheet-title">
                  <Clock size={16} />
                  {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("es-CR", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                </h3>
                <button type="button" className="cal-sheet-close" onClick={closeSheet} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="cal-sheet-body">
              <div className="d-flex flex-column gap-2">
                {daySlots.map((slot) => (
                  <div
                    key={slot.activityScheduleId}
                    className={[
                      "cal-hour-card",
                      slot.activityScheduleId === selectedScheduleId ? "cal-hour-card--selected" : "",
                      isPast(slot, now) ? "cal-hour-card--past" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => setSelectedScheduleId(slot.activityScheduleId)}
                  >
                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                      <span className="cal-hour-time">
                        <Clock size={14} className="me-1" />
                        {formatHour(slot.scheduledStart)} - {formatHour(slot.scheduledEnd)}
                      </span>
                      <span className="text-muted small">{slot.activityTitle}</span>
                    </div>
                  </div>
                ))}
              </div>

              {selected && (
                <div className="cal-detail">
                  <div className="cal-detail-head">
                    <h4 className="cal-detail-title">{selected.activityTitle}</h4>
                    {isPast(selected, now) ? (
                      <span className="cal-status cal-status--past">Finalizada</span>
                    ) : (
                      <span className="cal-status cal-status--upcoming">Próxima</span>
                    )}
                  </div>
                  <div className="cal-detail-grid">
                    <div className="cal-detail-item">
                      <span className="cal-detail-label">Horario</span>
                      <span className="cal-detail-value">
                        {formatHour(selected.scheduledStart)} - {formatHour(selected.scheduledEnd)}
                      </span>
                    </div>
                    <div className="cal-detail-item">
                      <span className="cal-detail-label">Personas</span>
                      <span className="cal-detail-value">
                        <Users size={14} className="me-1" />{selected.totalPeople || 0}
                      </span>
                    </div>
                    <div className="cal-detail-item">
                      <span className="cal-detail-label">Reservas</span>
                      <span className="cal-detail-value">{selected.bookingCount || 0}</span>
                    </div>
                  </div>

                  <div className="cal-bookings">
                    <button
                      type="button"
                      className="cal-bookings-toggle"
                      onClick={() => setBookingsOpen((open) => !open)}
                      aria-expanded={bookingsOpen}
                    >
                      <Users size={13} />
                      Reservas de esta salida
                      {!bookingsLoading && bookings.length > 0 && (
                        <span className="cal-bookings-count">{bookings.length}</span>
                      )}
                      <ChevronDown size={16} className="chev" />
                    </button>

                    {bookingsOpen && (
                      bookingsLoading ? (
                        <div className="cal-bookings-empty mt-2"><Loader2 size={14} className="spin me-1" /> Cargando reservas...</div>
                      ) : bookings.length === 0 ? (
                        <div className="cal-bookings-empty mt-2">Esta salida no tiene reservas registradas.</div>
                      ) : (
                        <div className="mt-2">
                          {bookings.map((b) => (
                            <div key={b.id} className="cal-booking-row">
                              <div className="cal-booking-main">
                                <span className="cal-booking-name">{b.customerName}</span>
                                <span className="cal-booking-sub">
                                  {b.customerPhone && (
                                    <span><Phone size={12} className="me-1" />{b.customerPhone}</span>
                                  )}
                                  {b.companyName && <span className="cal-chip">{b.companyName}</span>}
                                </span>
                                {breakdown(b) && <span className="cal-booking-sub">{breakdown(b)}</span>}
                              </div>
                              <div className="cal-booking-right">
                                <span className="cal-booking-count">
                                  {b.numberOfPeople} {b.numberOfPeople === 1 ? "persona" : "personas"}
                                </span>
                                <span className={`cal-chip ${b.status === "confirmed" ? "cal-chip--confirmed" : b.status === "pending" ? "cal-chip--pending" : ""}`}>
                                  {b.status === "confirmed" ? "Confirmada" : b.status === "pending" ? "Pendiente" : b.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
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
                Suscribe tus actividades al calendario de tu celular. Se actualizan solas cuando cambian tus asignaciones.
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
