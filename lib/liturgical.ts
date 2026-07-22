// Calendario litúrgico católico-romano, locale español, con santoral
// argentino. Usa romcal v3 (`romcal@dev`) y el plugin
// `@romcal/calendar.argentina`. Los nombres ya vienen traducidos al
// español.
//
// Es la CAPA BASE del calendario: siempre disponible, sin huecos. Se
// combina con las lecturas de `liturgical_readings` (curas/manual) en el
// merge de `lib/calendario.ts`. Ver documentacion/calendario-liturgico-y-lecturas.md.
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
  color: string | null; // color litúrgico en español, minúscula (ej. "blanco", "morado")
  cycle: string | null; // ciclo dominical: "A" | "B" | "C"
};

// Mapeo del `rank` (string en romcal v3) al número usado internamente.
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
  colorNames: string[];
  sundayCycle: string | null;
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
      seasonNames?: string[];
      seasons?: string[];
      colorNames?: string[];
      cycles?: { sundayCycle?: string };
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
      colorNames: e.colorNames ?? [],
      sundayCycle: e.cycles?.sundayCycle ?? null,
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

// "YEAR_A" → "A", "YEAR_B" → "B", "YEAR_C" → "C".
function mapSundayCycle(c: string | null): string | null {
  const m = c?.match(/YEAR_([ABC])/);
  return m ? m[1] : null;
}

// El de mayor precedencia del día. romcal v3 los ordena así; por las dudas
// ordenamos por rank ascendente (1 = solemnidad, 6 = feria).
function topOf(entries: LiturgicalEntry[]): LiturgicalDay | null {
  if (!entries || entries.length === 0) return null;
  const sorted = [...entries].sort(
    (a, b) => (TYPE_RANK[a.rank] ?? 99) - (TYPE_RANK[b.rank] ?? 99)
  );
  const top = sorted[0];
  return {
    date: top.date,
    name: top.name,
    type: top.rank,
    seasonKey: top.seasons[0] ?? null,
    seasonName: top.seasonNames[0] ?? "Tiempo Ordinario",
    rank: TYPE_RANK[top.rank] ?? 99,
    color: top.colorNames[0]?.toLowerCase() ?? null,
    cycle: mapSundayCycle(top.sundayCycle),
  };
}

export async function getLiturgicalDay(
  date: Date | string = new Date()
): Promise<LiturgicalDay | null> {
  const key = typeof date === "string" ? date : toDateKey(date);
  const year = Number(key.slice(0, 4));
  const cal = await calendarFor(year);
  return topOf(cal[key] ?? []);
}

// Calendario base (romcal) de un mes completo: Record<"YYYY-MM-DD", LiturgicalDay>.
export async function getRomcalMonth(
  year: number,
  month: number
): Promise<Record<string, LiturgicalDay>> {
  const cal = await calendarFor(year);
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const out: Record<string, LiturgicalDay> = {};
  for (const [d, entries] of Object.entries(cal)) {
    if (!d.startsWith(prefix)) continue;
    const top = topOf(entries);
    if (top) out[d] = top;
  }
  return out;
}
