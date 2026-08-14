import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, ChevronDown, ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import type { AvailableSchedule } from "@/types/entities";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

interface Props {
  schedules: AvailableSchedule[];
  value: string;
  onChange: (scheduleId: string) => void;
  disabled?: boolean;
  /** Formatea un precio (sin símbolo). Ej: 1000 -> "1,000.00" */
  formatPrice?: (value: unknown) => string;
}

function dateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildGrid(viewDate: Date) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, i) =>
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
  );
}

function formatHour(value: string) {
  return value ? new Date(value).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }) : "-";
}

function capacityOf(s: AvailableSchedule) {
  return s.partySize || s.capacity || 0;
}

/** Nivel de disponibilidad: 'full' (0), 'low' (pocos) u 'ok'. */
function availLevel(s: AvailableSchedule): "ok" | "low" | "full" {
  const avail = s.availableSpaces ?? 0;
  if (avail <= 0) return "full";
  const cap = capacityOf(s);
  if (cap > 0 && avail <= Math.max(1, Math.ceil(cap * 0.25))) return "low";
  return "ok";
}

export default function ScheduleCalendarPicker({ schedules, value, onChange, disabled, formatPrice }: Props) {
  // Solo horarios futuros (no se puede vender en fechas pasadas),
  // pero conserva el ya seleccionado aunque sea pasado (caso: editar reserva).
  const future = useMemo(() => {
    const now = Date.now();
    return schedules.filter((s) => new Date(s.scheduledEnd).getTime() >= now || s.id === value);
  }, [schedules, value]);

  const byDay = useMemo(() => {
    const map = new Map<string, AvailableSchedule[]>();
    for (const s of future) {
      const key = dateKey(new Date(s.scheduledStart));
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    }
    return map;
  }, [future]);

  const monthsWithSlots = useMemo(() => {
    const set = new Set<string>(); // "YYYY-M"
    for (const s of future) {
      const d = new Date(s.scheduledStart);
      set.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
    return set;
  }, [future]);

  // Mes inicial: el del horario futuro más próximo (o el mes actual).
  const firstMonth = useMemo(() => {
    if (!future.length) return new Date();
    const earliest = future.reduce((a, b) =>
      new Date(a.scheduledStart) < new Date(b.scheduledStart) ? a : b
    );
    const d = new Date(earliest.scheduledStart);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, [future]);

  const [viewDate, setViewDate] = useState(firstMonth);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(firstMonth.getFullYear());
  const pickerRef = useRef<HTMLDivElement>(null);
  const dayPanelRef = useRef<HTMLDivElement>(null);

  // Cuando cambian los horarios (nueva actividad), reposiciona el mes.
  useEffect(() => {
    setViewDate(firstMonth);
    setSelectedDay(null);
  }, [firstMonth]);

  // Al elegir un día, baja suavemente hasta la lista de horarios.
  useEffect(() => {
    if (selectedDay && dayPanelRef.current) {
      dayPanelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedDay]);

  // Si viene un valor seleccionado (ej. editar), salta a su día.
  useEffect(() => {
    if (!value) return;
    const s = future.find((x) => x.id === value);
    if (s) {
      const d = new Date(s.scheduledStart);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
      setSelectedDay(dateKey(d));
    }
  }, [value, future]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPickerOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const grid = useMemo(() => buildGrid(viewDate), [viewDate]);
  const currentMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();
  const todayKey = dateKey(new Date());

  const daySlots = selectedDay ? byDay.get(selectedDay) ?? [] : [];
  const selected = future.find((s) => s.id === value) ?? null;
  const fmt = formatPrice ?? ((v: unknown) => String(v ?? 0));

  if (!future.length) {
    return <div className="sp-empty">No hay fechas próximas disponibles para esta actividad.</div>;
  }

  const changeMonth = (delta: number) => {
    setViewDate(new Date(viewYear, currentMonth + delta, 1));
    setSelectedDay(null);
  };
  const goToMonth = (y: number, m: number) => {
    setViewDate(new Date(y, m, 1));
    setSelectedDay(null);
    setPickerOpen(false);
  };
  const monthTitle = viewDate.toLocaleDateString("es-CR", { month: "long", year: "numeric" });

  return (
    <div className={`sp ${disabled ? "opacity-50 pe-none" : ""}`}>
      <div className="cal-toolbar">
        <button type="button" className="cal-nav-btn" onClick={() => changeMonth(-1)} aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <div className="cal-monthpick" ref={pickerRef}>
          <button type="button" className="cal-title-btn" onClick={() => { setPickerYear(viewYear); setPickerOpen((o) => !o); }} aria-expanded={pickerOpen} aria-haspopup="true">
            {monthTitle}
            <ChevronDown size={16} className="chev" />
          </button>
          {pickerOpen && (
            <div className="cal-pop" role="dialog" aria-label="Seleccionar mes y año">
              <div className="cal-pop-year">
                <button type="button" className="cal-pop-yr-btn" onClick={() => setPickerYear((y) => y - 1)} aria-label="Año anterior"><ChevronLeft size={16} /></button>
                <span className="cal-pop-year-label">{pickerYear}</span>
                <button type="button" className="cal-pop-yr-btn" onClick={() => setPickerYear((y) => y + 1)} aria-label="Año siguiente"><ChevronRight size={16} /></button>
              </div>
              <div className="cal-pop-grid">
                {MONTHS.map((label, index) => {
                  const isActive = pickerYear === viewYear && index === currentMonth;
                  const hasSlots = monthsWithSlots.has(`${pickerYear}-${index}`);
                  return (
                    <button key={label} type="button"
                      className={["cal-pop-month", isActive ? "cal-pop-month--active" : "", hasSlots ? "cal-pop-month--has" : ""].filter(Boolean).join(" ")}
                      onClick={() => goToMonth(pickerYear, index)}>
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
      </div>

      <div className="cal-grid mb-2">
        {WEEKDAYS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
      </div>
      <div className="cal-grid">
        {grid.map((date) => {
          const key = dateKey(date);
          const slots = byDay.get(key) ?? [];
          const hasSlots = slots.length > 0;
          const anyFree = slots.some((s) => (s.availableSpaces ?? 0) > 0);
          const onlyLow = hasSlots && anyFree && slots.every((s) => availLevel(s) !== "ok");
          const badgeMod = !anyFree ? "cal-badge--full" : onlyLow ? "cal-badge--low" : "";
          const classes = [
            "cal-cell",
            date.getMonth() !== currentMonth ? "cal-cell--other" : "",
            key === todayKey ? "cal-cell--today" : "",
            hasSlots ? "cal-cell--has" : "",
            key === selectedDay ? "cal-cell--selected" : "",
          ].filter(Boolean).join(" ");
          return (
            <div key={key} className={classes} onClick={() => { if (hasSlots) setSelectedDay(key); }}>
              <span className="cal-daynum">{date.getDate()}</span>
              {hasSlots && (
                <span className={`cal-badge ${badgeMod}`}>
                  <CalendarCheck size={11} />
                  {slots.length}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="cal-day-panel" ref={dayPanelRef}>
          <div className="cal-day-title">
            <Clock size={16} />
            {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })}
          </div>

          <div className="d-flex flex-column gap-2">
            {daySlots.map((s) => {
              const level = availLevel(s);
              const full = level === "full";
              const availClass = level === "full" ? "sp-avail-full" : level === "low" ? "sp-avail-low" : "sp-avail-ok";
              return (
                <div
                  key={s.id}
                  className={[
                    "cal-hour-card",
                    s.id === value ? "cal-hour-card--selected" : "",
                    full ? "cal-hour-card--full" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => { if (!full) onChange(s.id); }}
                >
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                    <span className="cal-hour-time">
                      <Clock size={14} className="me-1" />
                      {formatHour(s.scheduledStart)} - {formatHour(s.scheduledEnd)}
                    </span>
                    <span className={`sp-hour-avail ${availClass}`}>
                      {full ? "Agotado" : `${s.availableSpaces} de ${capacityOf(s)} disponibles`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {selected && selectedDay === dateKey(new Date(selected.scheduledStart)) && (() => {
            const level = availLevel(selected);
            const cap = capacityOf(selected);
            const booked = selected.bookedPeople ?? 0;
            const pct = cap > 0 ? Math.min(100, Math.round((booked / cap) * 100)) : 0;
            const fillMod = level === "full" ? "sp-meter-fill--full" : level === "low" ? "sp-meter-fill--low" : "";
            const availClass = level === "full" ? "sp-avail-full" : level === "low" ? "sp-avail-low" : "sp-avail-ok";
            return (
              <div className="cal-detail">
                <div className="cal-detail-head">
                  <h4 className="cal-detail-title">
                    {formatHour(selected.scheduledStart)} - {formatHour(selected.scheduledEnd)}
                  </h4>
                  <span className={`sp-hour-avail ${availClass}`}>
                    <Users size={13} className="me-1" />
                    {selected.availableSpaces} de {cap} disponibles
                  </span>
                </div>
                <div className="sp-meter">
                  <div className={`sp-meter-fill ${fillMod}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="cal-detail-label">{booked} ocupados de {cap}</div>
                <div className="sp-prices">
                  {selected.adultPrice !== undefined && <span className="sp-price">Adultos <strong>${fmt(selected.adultPrice)}</strong></span>}
                  {selected.childPrice !== undefined && <span className="sp-price">Niños <strong>${fmt(selected.childPrice)}</strong></span>}
                  {selected.seniorPrice !== undefined && <span className="sp-price">Mayores <strong>${fmt(selected.seniorPrice)}</strong></span>}
                  <span className="sp-price">Infantes <strong>$0.00</strong></span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
