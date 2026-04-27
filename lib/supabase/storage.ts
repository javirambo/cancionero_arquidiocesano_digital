/**
 * Buckets de Supabase Storage para el Cancionero.
 * Crearlos desde el dashboard de Supabase con las políticas RLS correspondientes.
 */
export const STORAGE_BUCKETS = {
  /** Partituras en PDF descargables. */
  partituras: "partituras",
  /** Audios de referencia (mp3/ogg). */
  audios: "audios",
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];
