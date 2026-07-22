// Loaders del CRUD de admin de salmos (tabla `salmos`, migración 0058).
// Server-only. Ver documentacion/calendario-liturgico-y-lecturas.md.

import { createClient } from "@/lib/supabase/server";
import type { SalmoMedia } from "@/lib/salmos";

export type SalmoRow = {
  id: string;
  psalm_number: number;
  ref: string | null;
  response: string;
  source: string;
  source_slug: string | null;
  audios: SalmoMedia[];
  scores: SalmoMedia[];
};

const COLS = "id, psalm_number, ref, response, source, source_slug, audios, scores";

/** Lista de salmos, ordenada por nº; filtro opcional por nº o texto de antífona. */
export async function listSalmos(q?: string): Promise<SalmoRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("salmos")
    .select(COLS)
    .order("psalm_number", { ascending: true })
    .order("response", { ascending: true });
  let rows = (data ?? []) as SalmoRow[];
  const term = q?.trim().toLowerCase();
  if (term) {
    rows = rows.filter(
      (r) => String(r.psalm_number) === term || r.response.toLowerCase().includes(term)
    );
  }
  return rows;
}

export async function getSalmo(id: string): Promise<SalmoRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("salmos").select(COLS).eq("id", id).single();
  return (data as SalmoRow) ?? null;
}
