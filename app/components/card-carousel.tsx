"use client";

import { Children, useEffect, useRef, type ReactNode } from "react";

/**
 * Carousel horizontal para listas de tarjetas (playlists, anuncios) en las
 * home (`/` y `/parroquias/[slug]`).
 *
 * El desplazamiento usa scroll-snap nativo de CSS: el dedo engancha la próxima
 * tarjeta contra el borde izquierdo, y la última queda pegada a la derecha
 * porque el scroll no puede avanzar más allá del final del contenido.
 *
 * Los items se estilan con selectores de hijo directo (`[&>li]:…`) para no
 * tener que repetir clases en cada llamada, y porque `PlaylistCard` ya emite
 * su propio `<li>` mientras que `AnnouncementCard` lo recibe del consumidor.
 *
 * Con un solo item no hay nada que desplazar: se renderiza a ancho completo,
 * pero conservando la misma altura fija para que todas las secciones se vean
 * parejas independientemente de cuántos items tengan.
 *
 * Es Client Component solo por el "guiño" periódico; las tarjetas se siguen
 * renderizando en el servidor y llegan acá como `children`.
 */

/** Cada cuánto se repite el guiño. */
const NUDGE_INTERVAL_MS = 10_000;
/** Cuántos píxeles se corre en cada asomada. */
const NUDGE_DISTANCE_PX = 20;
/** Duración de cada tramo (ida o vuelta) del guiño. */
const NUDGE_LEG_MS = 320;
/** ida, vuelta, ida, vuelta — dos guiños seguidos. */
const NUDGE_SEQUENCE = [NUDGE_DISTANCE_PX, 0, NUDGE_DISTANCE_PX, 0];

/**
 * Arranca y termina lento, con la velocidad máxima en el medio. Se anima a
 * mano en vez de usar `behavior: "smooth"` porque esa curva la elige el
 * navegador y no se puede ajustar.
 */
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function CardCarousel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = ref.current;
    // Sin ref (caso de un solo item, que no lleva carousel) no hay nada que hacer.
    if (!el) return;
    // Respeta a quien pidió menos animaciones en el sistema operativo.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let interval = 0;
    let frame = 0;
    let previousSnap = "";

    // Una vez que la persona movió el carousel ya sabe que se puede mover:
    // el guiño no tiene más sentido y se apaga para siempre.
    const stop = () => {
      window.clearInterval(interval);
      window.cancelAnimationFrame(frame);
      el.style.scrollSnapType = previousSnap;
      INTERACTION_EVENTS.forEach((e) => el.removeEventListener(e, stop));
    };

    // Anima `scrollLeft` hasta `target` y encadena el tramo siguiente.
    const runLeg = (index: number) => {
      if (index >= NUDGE_SEQUENCE.length) {
        el.style.scrollSnapType = previousSnap;
        return;
      }
      const from = el.scrollLeft;
      const delta = NUDGE_SEQUENCE[index] - from;
      let startedAt = 0;

      const step = (now: number) => {
        if (!startedAt) startedAt = now;
        const t = Math.min(1, (now - startedAt) / NUDGE_LEG_MS);
        el.scrollLeft = from + delta * easeInOutSine(t);
        if (t < 1) frame = window.requestAnimationFrame(step);
        else runLeg(index + 1);
      };
      frame = window.requestAnimationFrame(step);
    };

    const nudge = () => {
      // Si no hay desborde, no hay nada que insinuar.
      if (el.scrollWidth <= el.clientWidth) return;
      // Si ya no está al principio, alguien lo movió por su cuenta.
      if (el.scrollLeft > 1) return;

      // `scroll-snap-type: mandatory` pelearía contra un desplazamiento tan
      // chico y lo devolvería de golpe al punto de anclaje, así que se
      // suspende mientras dura el guiño.
      previousSnap = el.style.scrollSnapType;
      el.style.scrollSnapType = "none";
      runLeg(0);
    };

    INTERACTION_EVENTS.forEach((e) =>
      el.addEventListener(e, stop, { passive: true })
    );
    interval = window.setInterval(nudge, NUDGE_INTERVAL_MS);

    return stop;
  }, []);

  if (Children.count(children) <= 1) {
    // Las clases van literales: Tailwind escanea el código fuente y no puede
    // resolver nombres armados por interpolación.
    return <ul className="grid gap-3 [&>li]:h-[120px]">{children}</ul>;
  }

  return (
    <ul
      ref={ref}
      className={[
        // El `-mx-4 px-4` compensa el padding horizontal del `<main>` para que
        // el carousel llegue a los bordes de la pantalla y se vea asomar la
        // tarjeta siguiente; `scroll-px-4` alinea el snap con ese padding.
        "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4",
        // Ancho de cada tarjeta: 85% en celular (se asoma la siguiente),
        // ~48% en tablet y ~32% en escritorio. Altura fija para que todas las
        // tarjetas del carousel midan lo mismo sin importar su contenido.
        "[&>li]:h-[120px] [&>li]:w-[85%] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-[48%] lg:[&>li]:w-[32%]",
      ].join(" ")}
    >
      {children}
    </ul>
  );
}

const INTERACTION_EVENTS = [
  "pointerdown",
  "touchstart",
  "wheel",
  "keydown",
] as const;
