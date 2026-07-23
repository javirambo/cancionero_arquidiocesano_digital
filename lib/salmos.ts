// Helpers para vincular el salmo de una fecha (liturgical_readings.psalm) con
// un `salmos` del catálogo. La identidad es (nº de salmo, antífona normalizada).
// Ver documentacion/calendario-liturgico-y-lecturas.md.

// Un ítem de media de un salmo: audio (versión) o partitura (Simple/SATB).
// `path` apunta al bucket `images`, carpeta `salmos/`.
export type SalmoMedia = { label: string; path: string };

// Normaliza la antífona/respuesta para comparar entre fuentes (curas vs. coro):
// sin tildes, minúsculas, sin puntuación, palabras separadas por un espacio.
// Ej: "El Señor tenga piedad y nos bendiga." → "el senor tenga piedad y nos bendiga"
export function normalizeResponse(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Clave "flexible" para matchear antífonas entre fuentes: saca los marcadores de
// versión del coro ("- (2) -", "(2)") antes de normalizar. Ej:
// "El Señor es mi luz y mi salvación - (2) -" → "el senor es mi luz y mi salvacion".
export function looseKey(response: string | null | undefined): string {
  if (!response) return "";
  const s = response
    .replace(/\(\s*\d+\s*\)/g, " ") // "(2)"
    .replace(/(^|\s)-\s*\d+\s*-(\s|$)/g, " ") // "- 2 -"
    .replace(/\s-\s*$/g, " "); // "- " final
  return normalizeResponse(s);
}

// Extrae el número de salmo de una cita. "Sal 66, 2-3. 5" → 66.
// Devuelve null si no es un salmo (ej. cánticos "Lc 1, 46-55").
export function psalmNumberFromRef(ref: string | null | undefined): number | null {
  if (!ref) return null;
  const m = ref.match(/^\s*Sal(?:mo)?\.?\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

// -----------------------------------------------------------------------------
// Matcheo de un salmo del catálogo para el CRUD de lecturas — 3 estrategias.
// Cada una devuelve los candidatos ordenados (mejor primero). Si son >1, la UI
// pide desambiguar a mano. Ver documentacion/calendario-liturgico-y-lecturas.md §5.
// -----------------------------------------------------------------------------

// Forma mínima que necesitan los matchers (SalmoMini la cumple).
export type SalmoMatchable = {
  psalm_number: number;
  response: string;
  ref?: string | null;
};

const tokenSet = (s: string): Set<string> => new Set(s.split(" ").filter(Boolean));

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

// Solo los versículos, normalizados. "Sal 66, 2-3. 5. 6-8" → "2-3.5.6-8".
export function normalizeVerses(ref: string | null | undefined): string {
  if (!ref) return "";
  const afterComma = ref.split(",").slice(1).join(",");
  return afterComma.replace(/[^\d.\-]/g, "");
}

// Estrategia 1 — por número de salmo: todos los del mismo nº.
export function candidatosPorNumero<T extends SalmoMatchable>(
  psalmRef: string | null | undefined,
  salmos: T[]
): T[] {
  const num = psalmNumberFromRef(psalmRef);
  if (num == null) return [];
  return salmos.filter((s) => s.psalm_number === num);
}

// Estrategia 2 — automágico: nº + antífona (looseKey exacto, o Jaccard ≥ 0,72).
// Mismo criterio que el batch scripts/import-salmos-coro.ts --link.
export function candidatosAutomagico<T extends SalmoMatchable>(
  psalm: { ref?: string | null; response?: string | null },
  salmos: T[]
): T[] {
  const sameNum = candidatosPorNumero(psalm.ref, salmos);
  if (!sameNum.length) return [];
  const key = looseKey(psalm.response);
  const exact = sameNum.filter((s) => looseKey(s.response) === key);
  if (exact.length) return exact;
  const toks = tokenSet(key);
  return sameNum
    .map((s) => ({ s, sc: jaccard(toks, tokenSet(looseKey(s.response))) }))
    .filter((x) => x.sc >= 0.72)
    .sort((a, b) => b.sc - a.sc)
    .map((x) => x.s);
}

// Estrategia 3 — por versículos: nº + ref (exacta, o solapamiento de versículos).
export function candidatosPorVersiculos<T extends SalmoMatchable>(
  psalmRef: string | null | undefined,
  salmos: T[]
): T[] {
  const sameNum = candidatosPorNumero(psalmRef, salmos);
  const v = normalizeVerses(psalmRef);
  if (!sameNum.length || !v) return [];
  const exact = sameNum.filter((s) => normalizeVerses(s.ref) === v);
  if (exact.length) return exact;
  const vt = tokenSet(v.replace(/[.\-]/g, " "));
  return sameNum
    .map((s) => ({ s, sc: jaccard(vt, tokenSet(normalizeVerses(s.ref).replace(/[.\-]/g, " "))) }))
    .filter((x) => x.sc >= 0.5)
    .sort((a, b) => b.sc - a.sc)
    .map((x) => x.s);
}
