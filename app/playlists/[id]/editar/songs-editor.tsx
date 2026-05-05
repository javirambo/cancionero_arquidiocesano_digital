"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DragHandleIcon, TrashIcon, CloseIcon } from "@/app/components/icons";

type SongInPlaylist = {
  song_id: string;
  position: number;
  number: number | null;
  title: string;
};

type SongCandidate = {
  id: string;
  number: number | null;
  title: string;
  category: string | null;
  author: string | null;
};

export function PlaylistSongsEditor({
  playlistId,
  initialSongs,
}: {
  playlistId: string;
  initialSongs: SongInPlaylist[];
}) {
  const router = useRouter();
  const [songs, setSongs] = useState<SongInPlaylist[]>(initialSongs);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Buscar canciones publicadas usando el mismo endpoint que el buscador global.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/songs/buscar?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        if (cancelled) return;
        const inPl = new Set(songs.map((s) => s.song_id));
        setResults(
          (data.results ?? []).filter((r: SongCandidate) => !inPl.has(r.id))
        );
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, songs]);

  function clearSearch() {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  }

  async function addSong(c: SongCandidate) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const nextPosition =
      songs.length > 0 ? Math.max(...songs.map((s) => s.position)) + 1 : 1;
    const { error } = await supabase
      .from("playlist_songs")
      .insert({ playlist_id: playlistId, song_id: c.id, position: nextPosition });
    if (error) {
      setError(`No se pudo agregar: ${error.message}`);
      setBusy(false);
      return;
    }
    setSongs((prev) => [
      ...prev,
      {
        song_id: c.id,
        position: nextPosition,
        number: c.number,
        title: c.title,
      },
    ]);
    setQuery("");
    setResults([]);
    setBusy(false);
    router.refresh();
  }

  async function removeSong(songId: string, position: number) {
    const target = songs.find((s) => s.song_id === songId);
    if (!target) return;
    const ok = window.confirm(`¿Quitar "${target.title}" de la playlist?`);
    if (!ok) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("playlist_songs")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("song_id", songId)
      .eq("position", position);
    if (error) {
      setError(`No se pudo quitar: ${error.message}`);
      setBusy(false);
      return;
    }
    setSongs((prev) => prev.filter((s) => s.song_id !== songId));
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Buscador para agregar */}
      <div className="rounded-xl border border-border bg-sidebar p-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-secondary normal-case">
            Agregar canción
          </span>
          <div className="relative flex w-full items-center">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  clearSearch();
                }
              }}
              placeholder="Buscar por título, número o letra…"
              disabled={busy}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm normal-case"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Cancelar búsqueda"
                title="Cancelar búsqueda (Esc)"
                className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-sidebar hover:text-foreground"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        </label>
        {searching && (
          <p className="mt-2 text-xs normal-case text-muted-foreground">Buscando…</p>
        )}
        {results.length > 0 && (
          <ul className="mt-3 flex flex-col divide-y divide-border rounded-lg border border-border bg-background">
            {results.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 py-2 pl-3 pr-3"
              >
                <span className="min-w-0 flex-1 truncate text-base text-primary">
                  {c.number !== null ? `${c.number} · ${c.title}` : c.title}
                </span>
                <button
                  type="button"
                  onClick={() => addSong(c)}
                  disabled={busy}
                  aria-label={`Agregar ${c.title}`}
                  title="Agregar a la playlist"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-50"
                >
                  <span className="text-lg font-semibold leading-none">+</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm normal-case text-destructive">{error}</p>}

      {/* Listado actual */}
      {songs.length === 0 ? (
        <p className="rounded-xl border border-border bg-background p-4 text-sm normal-case text-muted-foreground">
          La playlist no tiene canciones todavía.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background">
          {songs
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((s) => (
              <li
                key={`${s.song_id}-${s.position}`}
                className="flex items-center gap-2 py-3 pl-1 pr-3"
              >
                <span
                  aria-hidden="true"
                  title="Arrastrar para reordenar"
                  className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center text-muted-foreground"
                >
                  <DragHandleIcon />
                </span>
                <span className="min-w-0 flex-1 truncate text-base text-primary">
                  {s.number !== null ? `${s.number} · ${s.title}` : s.title}
                </span>
                <button
                  type="button"
                  onClick={() => removeSong(s.song_id, s.position)}
                  disabled={busy}
                  aria-label={`Quitar ${s.title}`}
                  title="Quitar de la playlist"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent text-destructive transition-colors hover:border-destructive disabled:opacity-50"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
