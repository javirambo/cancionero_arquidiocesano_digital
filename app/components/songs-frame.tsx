"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
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
  showSeeAll = true,
  showHeading = true,
  lockedCategorySlugs,
}: {
  initialItems: Item[];
  initialTotal: number;
  pageSize: number;
  categories?: PublicCategoryOption[];
  showSeeAll?: boolean;
  showHeading?: boolean;
  /** Cuando viene definido, el filtro queda fijado por la URL: se ocultan el
   *  botón embudo y el chip removible, y todas las queries usan estos slugs. */
  lockedCategorySlugs?: string[];
}) {
  const isLocked = lockedCategorySlugs !== undefined;
  const [items, setItems] = useState<Item[]>(initialItems);
  const [total, setTotal] = useState<number>(initialTotal);
  const [page, setPage] = useState<number>(1);
  const [mode, setMode] = useState<Mode>("paged");
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categorySlugs, setCategorySlugs] = useState<string[]>(
    lockedCategorySlugs ?? []
  );
  const [pending, startTransition] = useTransition();

  if (
    initialTotal === 0 &&
    mode === "paged" &&
    !pending &&
    categorySlugs.length === 0
  )
    return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasPrev = mode === "paged" && page > 1;
  const hasNext = mode === "paged" && page < totalPages;
  const activeCategories = categorySlugs
    .map((slug) => categories.find((c) => c.slug === slug))
    .filter((c): c is PublicCategoryOption => Boolean(c));
  const hasActiveFilter = categorySlugs.length > 0;

  function buildQs(params: { q?: string; p?: number; cats?: string[] }) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.p !== undefined && params.p > 1) sp.set("p", String(params.p));
    if (params.cats) {
      for (const slug of params.cats) sp.append("cat", slug);
    }
    return sp.toString();
  }

  function fetchPage(nextPage: number, cats: string[] = categorySlugs) {
    startTransition(async () => {
      const qs = buildQs({ p: nextPage, cats });
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

  function fetchSearch(term: string, cats: string[] = categorySlugs) {
    startTransition(async () => {
      const qs = buildQs({ q: term, cats });
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

  // Debounce de la búsqueda. El input siempre está visible; cuando hay un
  // término dispara búsqueda, cuando se vacía vuelve al modo paginado.
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      if (mode === "search") fetchPage(1);
      return;
    }
    const handle = setTimeout(() => fetchSearch(term), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function applyCategories(next: string[]) {
    setCategorySlugs(next);
    const term = query.trim();
    if (term) {
      fetchSearch(term, next);
    } else {
      fetchPage(1, next);
    }
  }

  function toggleCategory(slug: string) {
    const next = categorySlugs.includes(slug)
      ? categorySlugs.filter((s) => s !== slug)
      : [...categorySlugs, slug];
    applyCategories(next);
  }

  function removeCategory(slug: string) {
    applyCategories(categorySlugs.filter((s) => s !== slug));
  }

  const arrowEnabled =
    "flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40 disabled:pointer-events-none";
  const arrowActive =
    "flex h-10 w-10 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground";

  return (
    <section className="flex flex-col gap-4">
      {showHeading && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl text-page-title">Cantos</h2>
          {showSeeAll && (
            <Link
              href="/canciones"
              className="text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary"
            >
              Ver catálogo →
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
        <span className="text-muted-foreground">
          <SearchIcon />
        </span>
        <input
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

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap items-center gap-3">
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
          {categories.length > 0 && !isLocked && (
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-label={filterOpen ? "Cerrar filtros" : "Filtrar por categoría"}
              aria-pressed={filterOpen || hasActiveFilter}
              className={
                hasActiveFilter || filterOpen ? arrowActive : arrowEnabled
              }
            >
              <span className="scale-150">
                <FilterIcon />
              </span>
            </button>
          )}
        </div>
      </div>

      {filterOpen && categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background px-3 py-2">
          {categories.map((c) => {
            const selected = categorySlugs.includes(c.slug);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.slug)}
                aria-pressed={selected}
                className={
                  selected
                    ? "rounded-full border border-primary bg-primary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground"
                    : "rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
                }
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {!filterOpen && !isLocked && activeCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs normal-case text-muted-foreground">
          <span>Filtrado por:</span>
          {activeCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => removeCategory(c.slug)}
              className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground"
              aria-label={`Quitar filtro ${c.name}`}
            >
              {c.name}
              <span className="scale-90">
                <CloseIcon />
              </span>
            </button>
          ))}
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
              : activeCategories.length === 1
                ? `No hay canciones en "${activeCategories[0].name}".`
                : activeCategories.length > 1
                  ? `No hay canciones que estén en todas: ${activeCategories
                      .map((c) => `"${c.name}"`)
                      .join(", ")}.`
                  : "No hay canciones."}
          </p>
        ) : (
          items.map((s) => <SongRow key={s.id} song={s} />)
        )}
      </div>
    </section>
  );
}
