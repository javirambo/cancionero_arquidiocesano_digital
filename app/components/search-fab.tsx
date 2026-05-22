"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "./icons";
import { SearchResultsList } from "./search-dialog";
import { useGlobalSearch } from "./use-global-search";

// Buscador flotante centrado en la base de la vista de canción. Colapsado es
// un botón redondo con lupa; al pulsarlo la misma cápsula se estira hacia los
// costados (transición de ancho) en una caja de búsqueda, con los resultados
// desplegados hacia arriba.
export function SearchFab() {
  const [open, setOpen] = useState(false);
  const { q, setQ, results, loading, totalResults, reset } =
    useGlobalSearch(open);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    reset();
    setOpen(false);
  };

  // Foco al abrir.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Cerrar al hacer click fuera o con ESC.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2"
    >
      {/* Panel de resultados, desplegado hacia arriba. */}
      {open && (q.trim() !== "" || loading) && (
        <div className="absolute bottom-14 left-1/2 max-h-[60vh] w-[90vw] max-w-2xl -translate-x-1/2 overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl">
          <SearchResultsList
            q={q}
            loading={loading}
            results={results}
            totalResults={totalResults}
            onResultClick={close}
          />
        </div>
      )}

      {/* Cápsula única: se estira de 40px (botón) al ancho de la caja. */}
      <div
        style={{
          width: open ? "min(90vw, 32rem)" : "2.5rem",
          backgroundColor: open ? "var(--color-background)" : "#436bb0",
        }}
        className={`flex h-10 items-center overflow-hidden rounded-full shadow-lg transition-[width,background-color] duration-300 ease-out ${
          open ? "border border-border" : ""
        }`}
      >
        {open ? (
          <>
            <span className="ml-3 shrink-0 text-muted-foreground">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar canción, playlist o parroquia…"
              className="min-w-0 flex-1 bg-transparent px-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar búsqueda"
              className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:text-primary"
            >
              <CloseIcon />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buscar"
            title="Buscar"
            className="flex h-10 w-10 shrink-0 items-center justify-center text-white focus:outline-none"
          >
            <SearchIcon />
          </button>
        )}
      </div>
    </div>
  );
}
