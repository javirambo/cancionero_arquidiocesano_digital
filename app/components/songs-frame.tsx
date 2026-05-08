"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type {
  PublicCategoryOption,
  SongCapabilities,
  SongSummary,
} from "@/lib/songs";
import { SongRow } from "@/app/components/song-row";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  FilterIcon,
  SearchIcon,
} from "@/app/components/icons";

type Item = SongSummary & SongCapabilities;
type Mode = "paged" | "search";

export function SongsFrame({
  initialItems,
  initialTotal,
  pageSize,
  categories = [],
}: {
  initialItems: Item[];
  initialTotal: number;
  pageSize: number;
  categories?: PublicCategoryOption[];
}) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(1);
  const [mode, setMode] = useState<Mode>("paged");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  if (initialTotal === 0 && mode === "paged" && !pending && !categorySlug)
    return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasPrev = mode === "paged" && page > 1;
  const hasNext = mode === "paged" && page < totalPages;
  const activeCategoryName =
    categorySlug !== null
      ? categories.find((c) => c.slug === categorySlug)?.name ?? null
      : null;

  function buildQs(params: { q?: string; p?: number; cat?: string | null }) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.p !== undefined && params.p > 1) sp.set("p", String(params.p));
    if (params.cat) sp.set("cat", params.cat);
    return sp.toString();
  }

  function fetchPage(nextPage: number, cat: string | null = categorySlug) {
    startTransition(async () => {
      const qs = buildQs({ p: nextPage, cat });
      const res = await fetch(`/api/songs/paged${qs ? `?${qs}` : ""}`, {
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

  function fetchSearch(term: string, cat: string | null = categorySlug) {
    startTransition(async () => {
      const qs = buildQs({ q: term, cat });
      const res = await fetch(`/api/songs/paged?${qs}`, {
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

  function toggleCategory(slug: string) {
    const next = categorySlug === slug ? null : slug;
    setCategorySlug(next);
    const term = query.trim();
    if (term && searchOpen) {
      fetchSearch(term, next);
    } else {
      fetchPage(1, next);
    }
  }

  function clearCategory() {
    toggleCategory(categorySlug ?? "");
  }

  const arrowEnabled =
    "flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:pointer-events-none";
  const arrowActive =
    "flex h-10 w-10 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground";

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
          {categories.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-label={filterOpen ? "Cerrar filtros" : "Filtrar por categoría"}
              aria-pressed={filterOpen || categorySlug !== null}
              className={
                categorySlug !== null || filterOpen ? arrowActive : arrowEnabled
              }
            >
              <span className="scale-150">
                <FilterIcon />
              </span>
            </button>
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

      {filterOpen && categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background px-3 py-2">
          {categories.map((c) => {
            const selected = categorySlug === c.slug;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.slug)}
                aria-pressed={selected}
                className={
                  selected
                    ? "rounded-full border border-primary bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground"
                    : "rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
                }
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {!filterOpen && activeCategoryName && (
        <div className="flex items-center gap-2 text-xs normal-case text-muted-foreground">
          <span>Filtrado por:</span>
          <button
            type="button"
            onClick={clearCategory}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground"
            aria-label={`Quitar filtro ${activeCategoryName}`}
          >
            {activeCategoryName}
            <span className="scale-90">
              <CloseIcon />
            </span>
          </button>
        </div>
      )}

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
              : activeCategoryName
                ? `No hay canciones en "${activeCategoryName}".`
                : "No hay canciones."}
          </p>
        ) : (
          items.map((s) => <SongRow key={s.id} song={s} />)
        )}
      </div>
    </section>
  );
}
