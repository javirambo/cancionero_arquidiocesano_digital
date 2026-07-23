// Loaders para el CRUD de admin de lecturas litúrgicas (edición manual de
// `liturgical_readings`). Server-only. Ver documentacion/calendario-liturgico-y-lecturas.md.

import { createClient } from "@/lib/supabase/server";
import type { SalmoMedia } from "@/lib/salmos";

// Discriminador de la lectura dentro de la fecha. Los días "empaquetados"
// (Navidad, vigilias) generan más de dos filas; ver migración 0060.
// El `(string & {})` mantiene el autocompletado de los valores conocidos sin
// cerrar el tipo (admite p. ej. "principal-2").
export type ReadingSet =
  | "principal"
  | "memoria"
  | "vigilia"
  | "noche"
  | "aurora"
  | "dia"
  | (string & {});

// Una opción de lectura. Cuando la página trae alternativas "O bien:", la
// primera va arriba y el resto en `alternatives`.
export type ReadingOption = {
  ref: string | null;
  heading: string | null;
  body: string;
};

export type ReadingSection = (ReadingOption & { alternatives?: ReadingOption[] }) | null;

export type PsalmSection = {
  ref: string | null;
  response: string | null;
  alt_responses?: string[]; // respuestas/antífonas alternativas ("O bien:")
  stanzas: string[];
} | null;

// Salmo del catálogo (media reusable), embebido por FK salmo_id → salmos.
export type SalmoMini = {
  id: string;
  psalm_number: number;
  ref: string | null;
  response: string;
  audios: SalmoMedia[];
  scores: SalmoMedia[];
};

export type ReadingRowFull = {
  id: string;
  event_date: string;
  reading_set: ReadingSet;
  celebration: string | null;
  color: string | null;
  liturgical_time: string | null;
  day_label: string | null;
  first_reading: ReadingSection;
  psalm: PsalmSection;
  second_reading: ReadingSection;
  gospel_accl: ReadingSection;
  gospel: ReadingSection;
  source_url: string;
  locked: boolean;
  salmo_id: string | null;
  salmo: SalmoMini | null;
};

const COLS =
  "id, event_date, reading_set, celebration, color, liturgical_time, day_label, " +
  "first_reading, psalm, second_reading, gospel_accl, gospel, source_url, locked, " +
  "salmo_id, salmo:salmos(id, psalm_number, ref, response, audios, scores)";

/** Filas crudas (principal/memoria) de una fecha, con el salmo linkeado. */
export async function getReadingRowsForDate(date: string): Promise<ReadingRowFull[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("liturgical_readings")
    .select(COLS)
    .eq("event_date", date)
    .order("reading_set");
  return (data ?? []) as unknown as ReadingRowFull[];
}

/** Lista compacta de salmos para el selector de vínculo. */
export async function listSalmosMini(): Promise<SalmoMini[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("salmos")
    .select("id, psalm_number, ref, response, audios, scores")
    .order("psalm_number", { ascending: true })
    .order("response", { ascending: true });
  return (data ?? []) as SalmoMini[];
}
