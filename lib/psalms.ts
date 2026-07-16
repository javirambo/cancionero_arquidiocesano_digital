// Salmos responsoriales. Se los reconoce por el título, que arranca con
// "SALMO" seguido de la cita ("SALMO 85, 5-6. 9-10. 15-16").
//
// Módulo puro a propósito: lo usan tanto el servidor (lib/songs.ts) como
// componentes de cliente, así que no puede depender de React ni de
// `next/headers`.

// `\b` evita partir palabras que solo empiezan igual (ej. "SALMODIA").
// La `i` es por si el título se cargó en minúscula; en pantalla se ve en
// mayúscula igual, por el `text-transform` global de los headings.
const PSALM_RE = /^\s*(salmo)\b(.*)$/i;

/** True si el título de la canción es el de un salmo responsorial. */
export function isPsalmTitle(title: string | null | undefined): boolean {
  return Boolean(title) && PSALM_RE.test(title as string);
}

/**
 * Parte "SALMO 85, 5-6" en `{ head: "SALMO", rest: " 85, 5-6" }` para poder
 * mostrar la cita más chica que la palabra.
 *
 * Devuelve null si no es un salmo, o si es solo la palabra "SALMO" sin cita
 * (no habría nada que achicar). Ojo: eso NO es lo mismo que `isPsalmTitle`,
 * que sí da true para "SALMO" pelado.
 */
export function splitPsalmTitle(
  title: string
): { head: string; rest: string } | null {
  const m = PSALM_RE.exec(title);
  if (!m) return null;
  if (m[2].trim() === "") return null;
  return { head: m[1], rest: m[2] };
}

/**
 * ¿La imagen adjunta se muestra embebida bajo el título?
 *
 * Solo en los salmos, donde la imagen es contenido (la notación de la
 * respuesta). En el resto de las canciones una imagen es una partitura
 * escaneada, así que va al menú de descargas como cualquier otro archivo.
 */
export function showsImageInline(title: string | null | undefined): boolean {
  return isPsalmTitle(title);
}
