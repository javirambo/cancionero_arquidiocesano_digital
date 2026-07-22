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
