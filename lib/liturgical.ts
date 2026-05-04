// Calendario litúrgico católico-romano, locale español, con santoral
// argentino. Usa romcal v3 (`romcal@dev`) y el plugin
// `@romcal/calendar.argentina`. Los nombres ya vienen traducidos al
// español; mantenemos un override mínimo solo para corregir mayúsculas
// en los títulos visibles ("5º domingo" → "5° Domingo").
//
// Nota sobre el dev tag: romcal@dev se actualiza, lo pinneamos por
// versión exacta en package.json para evitar drift.

import { Romcal } from "romcal";
import { Argentina_Es } from "@romcal/calendar.argentina";

export type LiturgicalDay = {
  date: string; // YYYY-MM-DD
  name: string; // ya en español (ej. "5º domingo de Pascua")
  type: string; // SOLEMNITY | SUNDAY | FEAST | MEMORIAL | OPTIONAL_MEMORIAL | WEEKDAY
  seasonKey: string | null; // ej: "EASTER_TIME", "ORDINARY_TIME", "ADVENT", "LENT", "CHRISTMAS_TIME"
  seasonName: string; // ya en español
  rank: number; // 1 = solemnidad, 2 = domingo, 3 = fiesta, 4 = memoria, 5 = mem. opcional, 6 = feria
};

// Mapeo del `rank` (string en romcal v3) al número usado por la home.
const TYPE_RANK: Record<string, number> = {
  SOLEMNITY: 1,
  SUNDAY: 2,
  FEAST: 3,
  MEMORIAL: 4,
  OPTIONAL_MEMORIAL: 5,
  WEEKDAY: 6,
};

// Cache por año.
const _calendarCache = new Map<number, Record<string, LiturgicalEntry[]>>();

type LiturgicalEntry = {
  date: string;
  name: string;
  rank: string;
  seasonNames: string[];
  seasons: string[];
};

let _romcalInstance: InstanceType<typeof Romcal> | null = null;

function getRomcal(): InstanceType<typeof Romcal> {
  if (!_romcalInstance) {
    _romcalInstance = new Romcal({
      localizedCalendar: Argentina_Es,
      scope: "gregorian",
    });
  }
  return _romcalInstance;
}

async function calendarFor(
  year: number
): Promise<Record<string, LiturgicalEntry[]>> {
  const cached = _calendarCache.get(year);
  if (cached) return cached;
  const romcal = getRomcal();
  const raw = (await romcal.generateCalendar(year)) as Record<
    string,
    Array<{
      date: string;
      name: string;
      rank: string;
      seasonNames: string[];
      seasons: string[];
    }>
  >;
  const out: Record<string, LiturgicalEntry[]> = {};
  for (const [d, list] of Object.entries(raw)) {
    out[d] = list.map((e) => ({
      date: e.date,
      name: e.name,
      rank: e.rank,
      seasonNames: e.seasonNames ?? [],
      seasons: e.seasons ?? [],
    }));
  }
  _calendarCache.set(year, out);
  return out;
}

function toDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function getLiturgicalDay(
  date: Date = new Date()
): Promise<LiturgicalDay | null> {
  const target = toDateKey(date);
  const cal = await calendarFor(date.getFullYear());
  const matches = cal[target];
  if (!matches || matches.length === 0) return null;

  // El primero en la lista es el de mayor precedencia (romcal v3 los
  // ordena así). Si por alguna razón no fuera el caso, ordenamos por
  // rank ascendente (1 = solemnidad, 6 = feria).
  const sorted = [...matches].sort(
    (a, b) => (TYPE_RANK[a.rank] ?? 99) - (TYPE_RANK[b.rank] ?? 99)
  );
  const top = sorted[0];

  return {
    date: target,
    name: top.name,
    type: top.rank,
    seasonKey: top.seasons[0] ?? null,
    seasonName: top.seasonNames[0] ?? "Tiempo Ordinario",
    rank: TYPE_RANK[top.rank] ?? 99,
  };
}
