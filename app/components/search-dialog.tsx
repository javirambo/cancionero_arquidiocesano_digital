"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { GlobalSearchResults } from "@/lib/songs";
import { CloseIcon, SearchIcon } from "./icons";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SearchDialog({ open, onClose }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>({
    songs: [],
    playlists: [],
    parishes: [],
  });
  const [loading, setLoading] = useState(false);
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

  // Búsqueda con debounce.
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (!term) {
      setResults({ songs: [], playlists: [], parishes: [] });
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(term)}`,
          { signal: AbortSignal.timeout(10_000) }
        );
        if (!res.ok) throw new Error("search failed");
        const data: GlobalSearchResults = await res.json();
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults({ songs: [], playlists: [], parishes: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open]);

  if (!open) return null;

  const totalResults =
    results.songs.length + results.playlists.length + results.parishes.length;

  const close = () => {
    setQ("");
    onClose();
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
          {q.trim() === "" && (
            <p className="px-6 py-8 text-center text-sm normal-case text-muted-foreground">
              Buscá por título, fragmento de letra, nombre de playlist o parroquia.
            </p>
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
            <Section title="Canciones">
              {results.songs.map((s) => (
                <ResultLink
                  key={`song-${s.id}`}
                  href={`/canciones/${s.slug}`}
                  onClick={close}
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
            <Section title="Playlists">
              {results.playlists.map((p) => (
                <ResultLink
                  key={`pl-${p.id}`}
                  href={`/playlists/${p.id}`}
                  onClick={close}
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
                  onClick={close}
                  title={p.name}
                  subtitle={
                    [p.address, p.city].filter(Boolean).join(" · ") || null
                  }
                />
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="border-b border-border bg-sidebar px-5 py-2 text-xs uppercase tracking-[0.2em] text-secondary">
        {title}
      </h3>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  );
}

function ResultLink({
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
        <span className="text-base text-primary">{title}</span>
        {subtitle && (
          <span className="text-xs normal-case text-muted-foreground">
            {subtitle}
          </span>
        )}
      </Link>
    </li>
  );
}
