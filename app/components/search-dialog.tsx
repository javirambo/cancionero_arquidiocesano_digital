"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CloseIcon, SearchIcon } from "./icons";
import { useGlobalSearch } from "./use-global-search";
import { useRecentSearches } from "./use-recent-searches";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SearchDialog({ open, onClose }: Props) {
  const { q, setQ, results, loading, totalResults, reset } =
    useGlobalSearch(open);
  const { recent, addRecent } = useRecentSearches();
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco al abrir.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Cerrar con ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const close = () => {
    reset();
    onClose();
  };

  // Al abrir un resultado guardamos el término tipeado en el historial.
  const selectResult = () => {
    addRecent(q);
    close();
  };

  // Tocar una búsqueda reciente rellena el input y vuelve a enfocarlo.
  const runRecent = (term: string) => {
    setQ(term);
    inputRef.current?.focus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-border px-5 py-3">
          <span className="text-muted-foreground">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar canción, playlist o parroquia…"
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:text-primary"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto">
          <SearchResultsList
            q={q}
            loading={loading}
            results={results}
            totalResults={totalResults}
            onResultClick={selectResult}
            recent={recent}
            onRecentClick={runRecent}
          />
        </div>
      </div>
    </div>
  );
}

// Render compartido de resultados (estados vacío/cargando/sin-resultados +
// secciones Cantos/Listas/Parroquias). Usado por el modal y la caja flotante.
export function SearchResultsList({
  q,
  loading,
  results,
  totalResults,
  onResultClick,
  recent,
  onRecentClick,
}: {
  q: string;
  loading: boolean;
  results: import("@/lib/songs").GlobalSearchResults;
  totalResults: number;
  onResultClick: () => void;
  recent?: string[];
  onRecentClick?: (term: string) => void;
}) {
  return (
    <>
      {q.trim() === "" && (
        <>
          {recent && recent.length > 0 && (
            <Section title="Búsquedas recientes">
              {recent.map((term) => (
                <li key={term}>
                  <button
                    type="button"
                    onClick={() => onRecentClick?.(term)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left normal-case transition-colors hover:bg-sidebar"
                  >
                    <span aria-hidden="true" className="shrink-0 text-muted-foreground">
                      <SearchIcon />
                    </span>
                    <span className="text-base text-foreground">{term}</span>
                  </button>
                </li>
              ))}
            </Section>
          )}
          <p className="px-6 py-8 text-center text-sm normal-case text-muted-foreground">
            Buscá por título, fragmento de letra, nombre de playlist o parroquia.
          </p>
        </>
      )}
      {q.trim() !== "" && loading && (
        <p className="px-6 py-8 text-center text-sm normal-case text-muted-foreground">
          Buscando…
        </p>
      )}
      {q.trim() !== "" && !loading && totalResults === 0 && (
        <p className="px-6 py-8 text-center text-sm normal-case text-muted-foreground">
          No se encontraron resultados.
        </p>
      )}

      {results.songs.length > 0 && (
        <Section title="Cantos">
          {results.songs.map((s) => (
            <ResultLink
              key={`song-${s.id}`}
              href={`/canciones/${s.slug}`}
              onClick={onResultClick}
              title={s.title}
              subtitle={
                [
                  s.number !== null ? `Nº ${s.number}` : null,
                  s.author,
                  s.category,
                ]
                  .filter(Boolean)
                  .join(" · ") || null
              }
            />
          ))}
        </Section>
      )}

      {results.playlists.length > 0 && (
        <Section title="Listas">
          {results.playlists.map((p) => (
            <ResultLink
              key={`pl-${p.id}`}
              href={`/playlists/${p.id}`}
              onClick={onResultClick}
              title={p.name}
              subtitle={p.parish?.name ?? null}
            />
          ))}
        </Section>
      )}

      {results.parishes.length > 0 && (
        <Section title="Parroquias">
          {results.parishes.map((p) => (
            <ResultLink
              key={`pa-${p.id}`}
              href={`/parroquias/${p.slug}`}
              onClick={onResultClick}
              title={p.name}
              subtitle={
                [p.address, p.city].filter(Boolean).join(" · ") || null
              }
            />
          ))}
        </Section>
      )}
    </>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="border-b border-border bg-sidebar px-5 py-2 text-xs uppercase tracking-[0.2em] text-primary">
        {title}
      </h3>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  );
}

export function ResultLink({
  href,
  onClick,
  title,
  subtitle,
}: {
  href: string;
  onClick: () => void;
  title: string;
  subtitle: string | null;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className="flex flex-col gap-1 px-5 py-3 transition-colors hover:bg-sidebar"
      >
        <span className="text-base text-song-title">{title}</span>
        {subtitle && (
          <span className="text-xs normal-case text-muted-foreground">
            {subtitle}
          </span>
        )}
      </Link>
    </li>
  );
}
