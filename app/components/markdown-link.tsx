"use client";

import type { MouseEvent, ReactNode } from "react";

/**
 * Link dentro del mini-markdown. Decide en el click:
 * - mismo origen que la página actual → navega en la misma pestaña.
 * - origen externo → abre en pestaña nueva.
 *
 * El markup renderizado es igual en server y cliente (un `<a>` común), así que
 * no hay hydration mismatch; la comparación de origen ocurre al hacer click.
 */
export function MarkdownLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // Dejar pasar clicks con modificadores o botón no primario (el navegador
    // ya los maneja: abrir en nueva pestaña, etc.).
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    let target: URL;
    try {
      target = new URL(e.currentTarget.href, window.location.href);
    } catch {
      return;
    }
    if (target.origin !== window.location.origin) {
      e.preventDefault();
      window.open(target.href, "_blank", "noopener,noreferrer");
    }
    // Mismo origen: navegación normal en la misma pestaña.
  }

  return (
    <a href={href} onClick={onClick} className="text-primary underline">
      {children}
    </a>
  );
}
