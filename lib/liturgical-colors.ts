// Colores litúrgicos reales (dato, no tema de la app). Compartido por el CRUD
// de lecturas (form, lista mensual) y el render público.
// Un `color` puede venir combinado del ORDO ("morado o rosa", "verde o blanco")
// cuando el día ofrece dos colores; `splitColors` lo parte en tokens.

export const COLOR_HEX: Record<string, string> = {
  verde: "#2e7d32",
  rojo: "#c62828",
  blanco: "#f5f5f5",
  morado: "#6a1b9a",
  rosa: "#ec8fb5",
  negro: "#222222",
};

export const LITURGICAL_COLORS = ["verde", "rojo", "blanco", "morado", "rosa", "negro"] as const;

/** Parte un color combinado ("morado o rosa") en sus tokens ("morado", "rosa"). */
export function splitColors(color: string | null | undefined): string[] {
  if (!color) return [];
  return color
    .split(/\s+o\s+/i)
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
}

/** Hex de un token de color, o undefined si no es un color conocido. */
export function colorHex(token: string): string | undefined {
  return COLOR_HEX[token.trim().toLowerCase()];
}
