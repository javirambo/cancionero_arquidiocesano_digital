// Genera un slug URL-safe a partir de un texto. Quita acentos, pasa a
// minúsculas, reemplaza espacios y signos por guiones.
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
