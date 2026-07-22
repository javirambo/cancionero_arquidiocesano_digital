// Merge del calendario litúrgico: romcal (capa base, sin huecos) + las
// lecturas de `liturgical_readings` (curas / manual). Precedencia por campo:
// la fila de lecturas manda sobre romcal para nombre/tiempo/color; romcal
// aporta rango/ciclo (que curas no da estructurados) y rellena los días sin
// fila. Server-only (romcal es Node; usa el cliente server de Supabase).
//
// Ver documentacion/calendario-liturgico-y-lecturas.md (§1, §4).

import { createClient } from "@/lib/supabase/server";
import { getLiturgicalDay, getRomcalMonth, type LiturgicalDay } from "@/lib/liturgical";

export type LecturaSeccion = {
  ref: string | null;
  heading: string | null;
  body: string;
} | null;

export type LecturaSalmo = {
  ref: string | null;
  response: string | null;
  stanzas: string[];
  files?: { kind: string; path: string }[];
} | null;

export type LecturasDelDia = {
  reading_set: "principal" | "memoria";
  celebration: string | null;
  color: string | null;
  liturgical_time: string | null;
  day_label: string | null;
  first_reading: LecturaSeccion;
  psalm: LecturaSalmo;
  second_reading: LecturaSeccion;
  gospel_accl: LecturaSeccion;
  gospel: LecturaSeccion;
  locked: boolean;
};

export type DiaLiturgico = {
  fecha: string; // YYYY-MM-DD
  nombre: string;
  tiempo: string | null;
  color: string | null;
  rango: string; // enum de romcal (SOLEMNITY | SUNDAY | ...)
  rangoNum: number; // 1 = solemnidad … 6 = feria
  ciclo: string | null; // "A" | "B" | "C"
  lecturas: { principal: LecturasDelDia | null; memoria: LecturasDelDia | null };
  fuente: "manual" | "curas" | "romcal";
};

type ReadingRow = LecturasDelDia & { event_date: string };

const SELECT_COLS =
  "event_date, reading_set, celebration, color, liturgical_time, day_label, " +
  "first_reading, psalm, second_reading, gospel_accl, gospel, locked";

function toLecturas(row: ReadingRow): LecturasDelDia {
  return {
    reading_set: row.reading_set,
    celebration: row.celebration,
    color: row.color,
    liturgical_time: row.liturgical_time,
    day_label: row.day_label,
    first_reading: row.first_reading,
    psalm: row.psalm,
    second_reading: row.second_reading,
    gospel_accl: row.gospel_accl,
    gospel: row.gospel,
    locked: row.locked,
  };
}

function merge(
  fecha: string,
  base: LiturgicalDay | null,
  rows: ReadingRow[]
): DiaLiturgico {
  const principal = rows.find((r) => r.reading_set === "principal") ?? null;
  const memoria = rows.find((r) => r.reading_set === "memoria") ?? null;
  const fuente: DiaLiturgico["fuente"] = principal
    ? principal.locked
      ? "manual"
      : "curas"
    : "romcal";
  return {
    fecha,
    nombre: principal?.celebration || base?.name || "",
    tiempo: principal?.liturgical_time || base?.seasonName || null,
    color: principal?.color || base?.color || null,
    rango: base?.type ?? "WEEKDAY",
    rangoNum: base?.rank ?? 6,
    ciclo: base?.cycle ?? null,
    lecturas: {
      principal: principal ? toLecturas(principal) : null,
      memoria: memoria ? toLecturas(memoria) : null,
    },
    fuente,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Día litúrgico unificado (romcal + lecturas) para una fecha "YYYY-MM-DD". */
export async function getDiaLiturgico(fecha: string): Promise<DiaLiturgico> {
  const base = await getLiturgicalDay(fecha);
  const supabase = await createClient();
  const { data } = await supabase
    .from("liturgical_readings")
    .select(SELECT_COLS)
    .eq("event_date", fecha);
  return merge(fecha, base, (data ?? []) as unknown as ReadingRow[]);
}

/** Mes litúrgico unificado: un `DiaLiturgico` por día, ordenado por fecha. */
export async function getMesLiturgico(
  year: number,
  month: number
): Promise<DiaLiturgico[]> {
  const base = await getRomcalMonth(year, month);
  const supabase = await createClient();
  const start = `${year}-${pad(month)}-01`;
  const nextY = month === 12 ? year + 1 : year;
  const nextM = month === 12 ? 1 : month + 1;
  const nextStart = `${nextY}-${pad(nextM)}-01`;
  const { data } = await supabase
    .from("liturgical_readings")
    .select(SELECT_COLS)
    .gte("event_date", start)
    .lt("event_date", nextStart);

  const byDate = new Map<string, ReadingRow[]>();
  for (const r of (data ?? []) as unknown as ReadingRow[]) {
    const arr = byDate.get(r.event_date) ?? [];
    arr.push(r);
    byDate.set(r.event_date, arr);
  }
  const fechas = new Set<string>([...Object.keys(base), ...byDate.keys()]);
  return [...fechas]
    .sort()
    .map((d) => merge(d, base[d] ?? null, byDate.get(d) ?? []));
}
