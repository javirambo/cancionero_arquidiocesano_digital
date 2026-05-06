"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { SongCapabilities, SongSummary } from "@/lib/songs";
import { SongRow } from "@/app/components/song-row";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  SearchIcon,
} from "@/app/components/icons";

type Item = SongSummary & SongCapabilities;
type Mode = "paged" | "search";

export function SongsFrame({
  initialItems,
  initialTotal,
  pageSize,
}: {
  initialItems: Item[];
  initialTotal: number;
  pageSize: number;
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(1);
  const [mode, setMode] = useState<Mode>("paged");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  if (initialTotal === 0 && mode === "paged" && !pending) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasPrev = mode === "paged" && page > 1;
  const hasNext = mode === "paged" && page < totalPages;

  function fetchPage(nextPage: number) {
    startTransition(async () => {
      const res = await fetch(`/api/songs/paged?p=${nextPage}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Item[]; total: number; page: number };
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
      setMode("paged");
    });
  }

  function fetchSearch(term: string) {
    startTransition(async () => {
      const res = await fetch(`/api/songs/paged?q=${encodeURIComponent(term)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Item[]; total: number };
      setItems(data.items);
      setTotal(data.total);
      setPage(1);
      setMode("search");
    });
  }

  // Debounce de la búsqueda.
  useEffect(() => {
    if (!searchOpen) return;
    const term = query.trim();
    if (!term) {
      // Volver a paginado solo si veníamos de búsqueda.
      if (mode === "search") fetchPage(1);
      return;
    }
    const handle = setTimeout(() => fetchSearch(term), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchOpen]);

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    if (mode === "search") fetchPage(1);
  }

  const arrowEnabled =
    "flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:pointer-events-none";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl">Cantos</h2>
          <Link
            href="/canciones"
            className="text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary"
          >
            Ver catálogo →
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs normal-case text-muted-foreground">
            {mode === "paged"
              ? `Cantos ${from}–${to} de ${total}`
              : `${total} resultado${total === 1 ? "" : "s"}`}
          </span>
          {mode === "paged" && (
            <>
              <button
                type="button"
                onClick={() => fetchPage(page - 1)}
                disabled={!hasPrev || pending}
                aria-label="Anterior"
                className={arrowEnabled}
              >
                <span className="scale-150">
                  <ChevronLeftIcon />
                </span>
              </button>
              <button
                type="button"
                onClick={() => fetchPage(page + 1)}
                disabled={!hasNext || pending}
                aria-label="Siguiente"
                className={arrowEnabled}
              >
                <span className="scale-150">
                  <ChevronRightIcon />
                </span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={searchOpen ? closeSearch : openSearch}
            aria-label={searchOpen ? "Cerrar búsqueda" : "Buscar"}
            className={arrowEnabled}
          >
            <span className="scale-150">
              {searchOpen ? <CloseIcon /> : <SearchIcon />}
            </span>
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <span className="text-muted-foreground">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por número, título o letra…"
            className="flex-1 bg-transparent text-sm normal-case outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar"
              className="text-muted-foreground hover:text-primary"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      )}

      <div
        role="list"
        className={`flex flex-col divide-y divide-border rounded-xl border border-border bg-background transition-opacity ${
          pending ? "opacity-50" : ""
        }`}
      >
        {items.length === 0 ? (
          <p className="px-5 py-6 text-sm normal-case text-muted-foreground">
            {mode === "search"
              ? "No se encontraron canciones."
              : "No hay canciones."}
          </p>
        ) : (
          items.map((s) => <SongRow key={s.id} song={s} />)
        )}
      </div>
    </section>
  );
}
