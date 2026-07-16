/**
 * Buckets de Supabase Storage para el Cancionero.
 * Crearlos desde el dashboard de Supabase con las políticas RLS correspondientes.
 */
export const STORAGE_BUCKETS = {
  /** Partituras en PDF descargables. */
  partituras: "partituras",
  /** Audios de referencia (mp3/ogg). */
  audios: "audios",
  /** Imágenes para cards de playlists y anuncios (bucket público). */
  images: "images",
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * Nombre con el que queda guardado un archivo al descargarlo.
 *
 * `base` es el texto legible (la etiqueta del archivo o el título de la
 * canción) y `path` aporta la extensión.
 *
 * El nombre viaja como query param `?download=` de la signed URL y Supabase
 * lo devuelve en el `Content-Disposition`. Ese ida y vuelta NO es
 * transparente: supabase-js arma el param con `URLSearchParams`, que
 * serializa como formulario (espacio → `+`, coma → `%2C`), y el storage
 * decodifica solo una parte. Un título como "SALMO 85, 5-6" terminaba en
 * disco como `SALMO 85%2C 5-6.mp3`.
 *
 * Por eso reducimos el nombre a `[A-Za-z0-9._-]`, que es justo el conjunto
 * que `URLSearchParams` deja intacto: así lo que se pide es lo que llega.
 * Las tildes se transliteran (`canción` → `cancion`) porque si no se
 * escapan como `%C3%B3`. Esto además cubre los caracteres que son ilegales
 * en los nombres de archivo de Windows y macOS.
 */
export function downloadFilename(base: string, path: string): string {
  const clean = (s: string) =>
    s
      // Separar tildes de su letra y descartarlas: "ó" → "o".
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      // Puntos o guiones bajos al borde ensucian el nombre y, al final,
      // duplicarían el punto de la extensión.
      .replace(/^[._]+|[._]+$/g, "");

  const name = clean(base) || "archivo";
  const rawExt = path.includes(".") ? path.split(".").pop() ?? "" : "";
  const ext = clean(rawExt);
  return ext ? `${name}.${ext}` : name;
}

/**
 * Devuelve la URL pública de una imagen del bucket `images`.
 * El bucket es público, así que no requiere signed URL.
 */
export function getPublicImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${STORAGE_BUCKETS.images}/${path}`;
}

/**
 * Si la URL apunta a una imagen del bucket `images`, devuelve su path interno.
 * Devuelve null para URLs externas (no las administramos).
 */
export function getImagePathFromPublicUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const prefix = `${base}/storage/v1/object/public/${STORAGE_BUCKETS.images}/`;
  if (!url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  return path.length > 0 ? path : null;
}
