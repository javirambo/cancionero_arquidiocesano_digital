"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function SearchForm({
  defaultValue,
  estado,
  orden,
}: {
  defaultValue: string;
  estado: string;
  orden: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPushedRef = useRef(defaultValue);

  function buildHref(q: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado !== "todas") params.set("estado", estado);
    if (orden !== "modificacion") params.set("orden", orden);
    return `/admin/canciones${params.toString() ? `?${params.toString()}` : ""}`;
  }

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === lastPushedRef.current) return;
    const t = setTimeout(() => {
      lastPushedRef.current = trimmed;
      router.replace(buildHref(trimmed));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, estado, orden]);

  function clear() {
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <div className="relative flex w-full">
      <input
        ref={inputRef}
        type="text"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar por título o número…"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm normal-case"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-sidebar hover:text-foreground"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
