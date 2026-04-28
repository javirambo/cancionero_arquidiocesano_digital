"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por título, número o letra…"
            disabled={busy}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case"
          />
        </label>
        {searching && (
          <p className="mt-2 text-xs normal-case text-muted-foreground">Buscando…</p>
        )}
        {results.length > 0 && (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-background">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => addSong(c)}
                  disabled={busy}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left normal-case hover:bg-sidebar disabled:opacity-50"
                >
                  <span className="w-12 shrink-0 text-sm text-muted-foreground">
                    {c.number !== null ? String(c.number).padStart(3, "0") : "—"}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm text-primary">{c.title}</span>
                    {c.author && (
                      <span className="text-xs text-muted-foreground">
                        {c.author}
                      </span>
                    )}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-secondary">
                    + Agregar
                  </span>
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
        <ol className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background">
          {songs
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((s, i) => (
              <li key={`${s.song_id}-${s.position}`} className="flex items-center gap-3 px-4 py-3">
                <span className="w-8 shrink-0 text-sm normal-case text-muted-foreground">
                  {i + 1}.
                </span>
                <span className="w-12 shrink-0 text-sm normal-case text-muted-foreground">
                  {s.number !== null ? String(s.number).padStart(3, "0") : "—"}
                </span>
                <span className="flex-1 truncate text-base text-primary">
                  {s.title}
                </span>
                <button
                  type="button"
                  onClick={() => removeSong(s.song_id, s.position)}
                  disabled={busy}
                  title="Quitar de la playlist"
                  className="rounded-full border border-transparent px-3 py-1 text-xs uppercase tracking-wide text-destructive hover:border-destructive disabled:opacity-50"
                >
                  Quitar
                </button>
              </li>
            ))}
        </ol>
      )}
    </div>
  );
}
