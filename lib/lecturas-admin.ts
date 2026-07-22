// Loaders para el CRUD de admin de lecturas litúrgicas (edición manual de
// `liturgical_readings`). Server-only. Ver documentacion/calendario-liturgico-y-lecturas.md (§5).

import { createClient } from "@/lib/supabase/server";

export type ReadingSet = "principal" | "memoria";

export type ReadingSection = {
  ref: string | null;
  heading: string | null;
  body: string;
} | null;

export type PsalmFile = { kind: string; path: string };

export type PsalmSection = {
  ref: string | null;
  response: string | null;
  stanzas: string[];
  files?: PsalmFile[];
} | null;

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
};

const COLS =
  "id, event_date, reading_set, celebration, color, liturgical_time, day_label, " +
  "first_reading, psalm, second_reading, gospel_accl, gospel, source_url, locked";

/** Filas crudas (principal/memoria) de una fecha, para el editor. */
export async function getReadingRowsForDate(
  date: string
): Promise<ReadingRowFull[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("liturgical_readings")
    .select(COLS)
    .eq("event_date", date)
    .order("reading_set");
  return (data ?? []) as unknown as ReadingRowFull[];
}
