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
