"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function SearchForm({
  defaultValue,
  estado,
}: {
  defaultValue: string;
  estado: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  function buildHref(q: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado !== "todas") params.set("estado", estado);
    return `/admin/canciones${params.toString() ? `?${params.toString()}` : ""}`;
  }

  function clear() {
    setValue("");
    router.push(buildHref(""));
    inputRef.current?.focus();
  }

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(buildHref(value));
      }}
    >
      <div className="relative flex flex-1 min-w-[200px]">
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
      <button
        type="submit"
        className="rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-foreground hover:border-primary hover:text-primary"
      >
        Buscar
      </button>
    </form>
  );
}
