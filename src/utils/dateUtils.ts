/** Fecha de hoy en zona local (YYYY-MM-DD). */
export function todayDateInputValue(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

/**
 * Convierte ISO datetime o YYYY-MM-DD a valor para input/calendario (YYYY-MM-DD).
 */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toDateInputValueOrNull(
  value: string | null | undefined
): string | null {
  const normalized = toDateInputValue(value);
  return normalized || null;
}

/** Parsea YYYY-MM-DD o ISO a fecha local (solo día civil). */
export function parseLocalDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const input = toDateInputValue(dateStr);
  if (!input) return null;
  const [y, m, d] = input.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(dateStr: string | undefined): string {
  const date = parseLocalDate(dateStr);
  if (!date) return "";
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
