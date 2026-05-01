"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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

export function HelpHint({ label, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

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

  return (
    <span ref={ref} className="relative inline-flex">
      <button
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
          className="absolute left-1/2 top-7 z-30 w-64 -translate-x-1/2 rounded-xl border border-border bg-background p-3 text-xs normal-case text-foreground shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
