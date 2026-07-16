import { splitPsalmTitle } from "@/lib/psalms";

/**
 * Título de la canción.
 *
 * Los salmos responsoriales se titulan con su cita completa ("SALMO 85,
 * 5-6. 9-10. 15-16"), donde la referencia es mucho más larga que la palabra
 * que importa. La mostramos en chico para que "SALMO" siga leyéndose como
 * el título.
 *
 * `className` va al <h1> y define el tamaño base. La cita se dimensiona en
 * `em`, o sea relativa a ese tamaño, para servir tanto a la vista web
 * (`text-3xl`) como a la impresión (`text-[1.6em]`, que a su vez escala con
 * el tamaño de fuente elegido para el papel).
 */
export function SongTitle({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  const psalm = splitPsalmTitle(title);
  if (!psalm) {
    return <h1 className={className}>{title}</h1>;
  }
  return (
    <h1 className={className}>
      {psalm.head}
      <span className="text-[0.5em] tracking-normal">{psalm.rest}</span>
    </h1>
  );
}
