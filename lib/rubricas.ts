// Rúbricas litúrgicas DERIVADAS del calendario (no se scrapean ni se guardan en
// la base): dado un día litúrgico de romcal (rango + tiempo), decide si en la
// Misa se canta el Gloria y el Aleluya. Ver la doc en
// documentacion/calendario-liturgico-y-lecturas.md (§ Rúbricas: Gloria y Aleluya).
//
// Reglas (Ordenación General del Misal Romano / Leccionario):
//   - GLORIA: se canta en solemnidades, fiestas y domingos FUERA de Adviento y
//     Cuaresma. No en ferias ni memorias, ni en domingos de Adviento/Cuaresma.
//     Excepción: el Jueves Santo (Misa de la Cena del Señor) sí lo canta.
//   - ALELUYA: se canta SIEMPRE salvo en Cuaresma (se reemplaza por otra
//     aclamación) y en el Viernes/Sábado Santo. Vuelve en la Vigilia Pascual
//     (Domingo de Pascua, que ya es solemnidad).

import { getLiturgicalDay, type LiturgicalDay } from "@/lib/liturgical";

export type Rubricas = {
  /** Se canta el Gloria (Gloria in excelsis Deo). */
  gloria: boolean;
  /** Se canta el Aleluya (aclamación antes del Evangelio). */
  aleluya: boolean;
};

const ADVIENTO_CUARESMA = new Set(["ADVENT", "LENT"]);

/**
 * ¿Se canta el Gloria ese día?
 * Solemnidades y fiestas siempre; domingos salvo en Adviento/Cuaresma; más la
 * excepción del Jueves Santo. Ferias y memorias: no.
 */
export function cantaGloria(day: LiturgicalDay | null): boolean {
  if (!day) return false;
  if (day.type === "SOLEMNITY" || day.type === "FEAST") return true;
  if (day.type === "SUNDAY") return !ADVIENTO_CUARESMA.has(day.seasonKey ?? "");
  // Excepción: el Jueves Santo lleva Gloria aunque sea feria de Cuaresma.
  if (/jueves.*sant/i.test(day.name)) return true;
  return false;
}

/**
 * ¿Se canta el Aleluya ese día?
 * Sí salvo en Cuaresma y en el Viernes/Sábado Santo (Triduo no-solemnidad).
 * Vuelve en el Domingo de Pascua (solemnidad).
 */
export function cantaAleluya(day: LiturgicalDay | null): boolean {
  if (!day) return false;
  if (day.seasonKey === "LENT") return false;
  if (day.seasonKey === "PASCHAL_TRIDUUM" && day.type !== "SOLEMNITY") return false;
  return true;
}

/** Ambas rúbricas de un día litúrgico ya resuelto (romcal). Función pura. */
export function rubricasDe(day: LiturgicalDay | null): Rubricas {
  return { gloria: cantaGloria(day), aleluya: cantaAleluya(day) };
}

/**
 * Rúbricas de una fecha ("YYYY-MM-DD" o Date). Resuelve el día con romcal y
 * aplica las reglas. Úsese cuando solo se tiene la fecha; si ya se tiene el
 * `LiturgicalDay` (o el `DiaLiturgico` base), preferir `rubricasDe`.
 */
export async function rubricasEnFecha(date: string | Date): Promise<Rubricas> {
  return rubricasDe(await getLiturgicalDay(date));
}
