// Merge del calendario litúrgico: romcal (capa base, sin huecos) + las
// lecturas de `liturgical_readings` (curas / manual) + la media del salmo
// (audio/partitura) que vive en la tabla `salmos`, unida por `salmo_id`.
// Precedencia por campo: la fila de lecturas manda sobre romcal para
// nombre/tiempo/color; romcal aporta rango/ciclo y rellena los días sin fila.
// Server-only (romcal es Node; usa el cliente server de Supabase).
//
// Ver documentacion/calendario-liturgico-y-lecturas.md (§1, §4).

import { createClient } from "@/lib/supabase/server";
import { getPublicImageUrl } from "@/lib/supabase/storage";
import { getLiturgicalDay, getRomcalMonth, type LiturgicalDay } from "@/lib/liturgical";

export type LecturaSeccion = {
  ref: string | null;
  heading: string | null;
  body: string;
} | null;

export type SalmoMediaUrl = { label: string; url: string };

export type LecturaSalmo = {
  ref: string | null;
  response: string | null;
  stanzas: string[];
  audios: SalmoMediaUrl[]; // audios del salmo linkeado (versiones, URLs públicas)
  scores: SalmoMediaUrl[]; // partituras del salmo linkeado (Simple / SATB)
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

// Fila cruda de la query (con el salmo embebido por FK salmo_id → salmos).
type RawRow = {
  event_date: string;
  reading_set: "principal" | "memoria";
  celebration: string | null;
  color: string | null;
  liturgical_time: string | null;
  day_label: string | null;
  first_reading: LecturaSeccion;
  psalm: { ref: string | null; response: string | null; stanzas: string[] } | null;
  second_reading: LecturaSeccion;
  gospel_accl: LecturaSeccion;
  gospel: LecturaSeccion;
  locked: boolean;
  salmos: {
    audios: { label: string; path: string }[] | null;
    scores: { label: string; path: string }[] | null;
  } | null;
};

const SELECT_COLS =
  "event_date, reading_set, celebration, color, liturgical_time, day_label, " +
  "first_reading, psalm, second_reading, gospel_accl, gospel, locked, salmo_id, " +
  "salmos(audios, scores)";

function toUrls(items: { label: string; path: string }[] | null | undefined): SalmoMediaUrl[] {
  return (items ?? [])
    .map((m) => ({ label: m.label, url: getPublicImageUrl(m.path) }))
    .filter((x): x is SalmoMediaUrl => x.url !== null);
}

function toLecturas(row: RawRow): LecturasDelDia {
  const psalm: LecturaSalmo = row.psalm
    ? {
        ref: row.psalm.ref ?? null,
        response: row.psalm.response ?? null,
        stanzas: row.psalm.stanzas ?? [],
        audios: toUrls(row.salmos?.audios),
        scores: toUrls(row.salmos?.scores),
      }
    : null;
  return {
    reading_set: row.reading_set,
    celebration: row.celebration,
    color: row.color,
    liturgical_time: row.liturgical_time,
    day_label: row.day_label,
    first_reading: row.first_reading,
    psalm,
    second_reading: row.second_reading,
    gospel_accl: row.gospel_accl,
    gospel: row.gospel,
    locked: row.locked,
  };
}

function merge(fecha: string, base: LiturgicalDay | null, rows: RawRow[]): DiaLiturgico {
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

/** Día litúrgico unificado (romcal + lecturas + media del salmo) para "YYYY-MM-DD". */
export async function getDiaLiturgico(fecha: string): Promise<DiaLiturgico> {
  const base = await getLiturgicalDay(fecha);
  const supabase = await createClient();
  const { data } = await supabase
    .from("liturgical_readings")
    .select(SELECT_COLS)
    .eq("event_date", fecha);
  return merge(fecha, base, (data ?? []) as unknown as RawRow[]);
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

  const byDate = new Map<string, RawRow[]>();
  for (const r of (data ?? []) as unknown as RawRow[]) {
    const arr = byDate.get(r.event_date) ?? [];
    arr.push(r);
    byDate.set(r.event_date, arr);
  }
  const fechas = new Set<string>([...Object.keys(base), ...byDate.keys()]);
  return [...fechas].sort().map((d) => merge(d, base[d] ?? null, byDate.get(d) ?? []));
}
