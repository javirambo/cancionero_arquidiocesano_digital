"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  initialValue: string;
};

export function SearchInput({ initialValue }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const lastPushedRef = useRef(initialValue);

  useEffect(() => {
    if (value === lastPushedRef.current) return;
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      lastPushedRef.current = value;
      const qs = params.toString();
      router.replace(qs ? `/canciones?${qs}` : "/canciones");
    }, 250);
    return () => clearTimeout(handle);
  }, [value, router, searchParams]);

  return (
    <div
      role="search"
      className="flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-background px-5 py-2 shadow-sm focus-within:border-primary"
    >
      <label htmlFor="q" className="sr-only">
        Buscar canción
      </label>
      <input
        id="q"
        name="q"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Busca por número, título o fragmento de letra..."
        autoComplete="off"
        className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Borrar búsqueda"
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sidebar hover:text-foreground"
        >
          <span aria-hidden="true">✕</span>
        </button>
      )}
    </div>
  );
}
