"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon, SortIcon } from "@/app/components/icons";

const OPTIONS: { value: string; label: string }[] = [
  { value: "nombre", label: "Ordenar por Nombre" },
  { value: "numero", label: "Ordenar por Número" },
  { value: "modificacion", label: "Ordenar por Fecha" },
];

export function OrdenSelect({
  value,
  q,
  estado,
}: {
  value: string;
  q: string;
  estado: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onChange(next: string) {
    setOpen(false);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado !== "todas") params.set("estado", estado);
    if (next !== "modificacion") params.set("orden", next);
    const qs = params.toString();
    router.push(`/admin/canciones${qs ? `?${qs}` : ""}`);
  }

  function onDescargar() {
    setOpen(false);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado !== "todas") params.set("estado", estado);
    if (value !== "modificacion") params.set("orden", value);
    const qs = params.toString();
    window.location.href = `/admin/canciones/descargar${qs ? `?${qs}` : ""}`;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Ordenar"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center text-muted-foreground hover:text-primary"
      >
        <SortIcon />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-border bg-background shadow-lg"
        >
          {OPTIONS.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                role="menuitem"
                type="button"
                onClick={() => onChange(o.value)}
                className={`block w-full px-3 py-2 text-left text-xs normal-case ${active ? "bg-sidebar font-semibold text-primary" : "text-foreground hover:bg-sidebar"}`}
              >
                {o.label}
              </button>
            );
          })}
          <div className="border-t border-border" />
          <button
            role="menuitem"
            type="button"
            onClick={onDescargar}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs normal-case text-foreground hover:bg-sidebar"
          >
            <DownloadIcon />
            Descargar listado
          </button>
        </div>
      )}
    </div>
  );
}
