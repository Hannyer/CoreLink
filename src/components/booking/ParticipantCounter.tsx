import { Minus, Plus } from "lucide-react";

interface Props {
  label: string;
  pricePerPerson?: number;
  count: number;
  onInc: () => void;
  onDec: () => void;
  onSet?: (value: number) => void;
  incDisabled?: boolean;
  note?: string;
  formatPrice?: (value: unknown) => string;
}

export default function ParticipantCounter({
  label, pricePerPerson, count, onInc, onDec, onSet, incDisabled, note, formatPrice,
}: Props) {
  const fmt = formatPrice ?? ((v: unknown) => String(v ?? 0));
  const price = Number(pricePerPerson) || 0; // el API puede mandar el precio como texto
  const hasPrice = price > 0;
  const subtotal = price * count;

  return (
    <div className="pc-row">
      <div className="pc-info">
        <span className="pc-label">{label}</span>
        <span className="pc-price">
          {hasPrice ? `$${fmt(price)} c/u` : "Sin costo"}
          {note ? ` · ${note}` : ""}
        </span>
      </div>
      <div className="pc-right">
        <span className="pc-subtotal">${fmt(subtotal)}</span>
        <div className="pc-stepper">
          <button type="button" className="pc-btn" onClick={onDec} disabled={count <= 0} aria-label={`Quitar ${label}`}>
            <Minus size={16} />
          </button>
          {onSet ? (
            <input
              className="pc-count-input"
              type="number"
              min={0}
              inputMode="numeric"
              value={count}
              onChange={(e) => onSet(e.target.value === "" ? 0 : parseInt(e.target.value, 10))}
              onFocus={(e) => e.target.select()}
              aria-label={`Cantidad de ${label}`}
            />
          ) : (
            <span className="pc-count">{count}</span>
          )}
          <button type="button" className="pc-btn" onClick={onInc} disabled={incDisabled} aria-label={`Agregar ${label}`}>
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
