import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Search, Users } from "lucide-react";
import type { Activity } from "@/types/entities";

interface Props {
  activities: Activity[];
  value: string;
  onChange: (activityId: string) => void;
  disabled?: boolean;
  /** Formatea un precio (sin símbolo). Ej: 25000 -> "25,000.00" */
  formatPrice?: (value: unknown) => string;
}

export default function ActivityCardPicker({ activities, value, onChange, disabled, formatPrice }: Props) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const fmt = formatPrice ?? ((v: unknown) => String(v ?? 0));

  const active = useMemo(() => activities.filter((a) => a.status), [activities]);

  // Si al abrir ya hay una actividad elegida, mostrarla colapsada.
  useEffect(() => { setExpanded(false); }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter(
      (a) =>
        (a.title || "").toLowerCase().includes(q) ||
        (a.activityTypeName || "").toLowerCase().includes(q)
    );
  }, [active, query]);

  const renderCard = (a: Activity, clickable: boolean) => (
    <button
      key={a.id}
      type="button"
      className={`ap-card ${a.id === value ? "ap-card--selected" : ""}`}
      onClick={clickable ? () => { onChange(a.id); setExpanded(false); } : undefined}
      aria-pressed={a.id === value}
    >
      <span className="ap-card-title">{a.title || a.activityTypeName || "Sin título"}</span>
      {a.activityTypeName && <span className="ap-type">{a.activityTypeName}</span>}
      <span className="ap-meta">
        {a.adultPrice > 0 && <span className="ap-price">Desde <strong>${fmt(a.adultPrice)}</strong></span>}
        {a.partySize > 0 && <span><Users size={12} className="me-1" />Hasta {a.partySize} personas</span>}
      </span>
    </button>
  );

  // Al editar no se puede cambiar la actividad: muestra solo la seleccionada.
  if (disabled) {
    const selected = active.find((a) => a.id === value);
    return (
      <div className="ap-disabled">
        {selected ? (
          <div className="ap-grid" style={{ maxHeight: "none" }}>{renderCard(selected, false)}</div>
        ) : (
          <div className="ap-empty">Sin actividad seleccionada.</div>
        )}
      </div>
    );
  }

  // Vista colapsada: ya hay actividad elegida y no se está cambiando.
  const selected = active.find((a) => a.id === value);
  if (selected && !expanded) {
    const price = Number(selected.adultPrice) || 0;
    return (
      <div className="ap-selected">
        <span className="ap-selected-check"><Check size={16} /></span>
        <div className="ap-selected-info">
          <span className="ap-card-title">{selected.title || selected.activityTypeName || "Sin título"}</span>
          <span className="ap-meta">
            {selected.activityTypeName && <span className="ap-type">{selected.activityTypeName}</span>}
            {price > 0 && <span className="ap-price">Desde <strong>${fmt(price)}</strong></span>}
            {selected.partySize > 0 && <span><Users size={12} className="me-1" />Hasta {selected.partySize} personas</span>}
          </span>
        </div>
        <button type="button" className="ap-change-btn" onClick={() => setExpanded(true)}>
          <Pencil size={14} />
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="ap-search-wrap">
        <Search size={16} className="ap-search-icon" />
        <input
          className="ap-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar actividad..."
          autoFocus
        />
      </div>

      {filtered.length === 0 ? (
        <div className="ap-empty">No se encontraron actividades.</div>
      ) : (
        <div className="ap-grid">
          {filtered.map((a) => renderCard(a, true))}
        </div>
      )}
    </div>
  );
}
