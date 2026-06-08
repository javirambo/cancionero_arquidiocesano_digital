"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Cantidad de líneas a mostrar antes de "Ver más...". */
  maxLines?: number;
};

export function ExpandableText({ children, className, maxLines = 4 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // El botón solo tiene sentido si el texto realmente desborda el límite.
    setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [children, maxLines]);

  const clampStyle = expanded
    ? undefined
    : {
        display: "-webkit-box",
        WebkitBoxOrient: "vertical" as const,
        WebkitLineClamp: maxLines,
        overflow: "hidden",
      };

  return (
    <div className={className}>
      <div ref={contentRef} style={clampStyle}>
        {children}
      </div>
      {overflowing && !expanded && (
        <button
          type="button"
          onClick={(e) => {
            // Evita navegar si la tarjeta es un enlace.
            e.preventDefault();
            e.stopPropagation();
            setExpanded(true);
          }}
          className="mt-1 text-sm font-medium text-primary hover:underline"
        >
          Ver más...
        </button>
      )}
    </div>
  );
}
