const TZ = "America/Argentina/Cordoba";
const LOCALE = "es-AR";

function aDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Fecha sin hora (ej: event_date "2026-04-30"). Si la pasamos a
    // new Date() se interpreta como UTC medianoche y al renderizar en
    // Cordoba (UTC-3) sale el día anterior. Forzamos mediodía UTC para
    // que cualquier zona horaria de Argentina caiga en el mismo día.
    return new Date(`${value}T12:00:00Z`);
  }
  return new Date(value);
}

export function formatearFecha(
  value: Date | string,
  opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" },
): string {
  return aDate(value).toLocaleDateString(LOCALE, { timeZone: TZ, ...opts });
}

export function formatearFechaHora(
  value: Date | string,
  opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  return aDate(value).toLocaleString(LOCALE, { timeZone: TZ, ...opts });
}

export function hoyEnCordoba(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}
