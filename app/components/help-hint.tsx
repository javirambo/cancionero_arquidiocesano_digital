"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { HelpIcon } from "./icons";

type Props = {
  /**
   * Etiqueta accesible. Se usa como `aria-label` y como título visible
   * arriba del cuerpo del popover si se pasa.
   */
  label: string;
  /** Contenido del popover (texto o JSX). */
  children: ReactNode;
};

const POPOVER_WIDTH = 256; // = w-64
const VIEWPORT_MARGIN = 8;

export function HelpHint({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"center" | "left" | "right">("center");
  const ref = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Decide la alineación del popover según el espacio disponible alrededor
  // del botón "?": centrado por defecto, anclado a la derecha si se sale por
  // la derecha del viewport, anclado a la izquierda si se sale por la izquierda.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const viewportWidth = window.innerWidth;
    const overflowRight = center + POPOVER_WIDTH / 2 > viewportWidth - VIEWPORT_MARGIN;
    const overflowLeft = center - POPOVER_WIDTH / 2 < VIEWPORT_MARGIN;
    if (overflowRight) setAlign("right");
    else if (overflowLeft) setAlign("left");
    else setAlign("center");
  }, [open]);

  const popoverPositionClass =
    align === "right"
      ? "right-0"
      : align === "left"
        ? "left-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary"
      >
        <HelpIcon />
      </button>
      {open && (
        <span
          role="dialog"
          className={`absolute top-7 z-30 w-64 rounded-xl border border-border bg-background p-3 text-xs normal-case text-foreground shadow-lg ${popoverPositionClass}`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
