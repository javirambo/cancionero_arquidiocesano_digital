"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandleIcon, TrashIcon, CloseIcon } from "@/app/components/icons";
import {
  hasAnyChord,
  semitonesBetween,
  transposeChord,
} from "@/lib/chordpro";

type SongInPlaylist = {
  song_id: string;
  position: number;
  number: number | null;
  title: string;
  body: string;
  original_key: string | null;
  key_override: string | null;
  status: string;
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
  const [songs, setSongs] = useState<SongInPlaylist[]>(() =>
    [...initialSongs].sort((a, b) => a.position - b.position)
  );
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

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

  function addSong(c: SongCandidate) {
    setError(null);
    setSongs((prev) => {
      const nextPosition =
        prev.length > 0 ? Math.max(...prev.map((s) => s.position)) + 1 : 1;
      return [
        ...prev,
        {
          song_id: c.id,
          position: nextPosition,
          number: c.number,
          title: c.title,
          body: "",
          original_key: null,
          key_override: null,
          status: "published",
        },
      ];
    });
    setDirty(true);
    setQuery("");
    setResults([]);
  }

  function setSongKeyOverride(songId: string, keyOverride: string | null) {
    setSongs((prev) =>
      prev.map((s) =>
        s.song_id === songId ? { ...s, key_override: keyOverride } : s
      )
    );
    setDirty(true);
  }

  function removeSong(songId: string) {
    const target = songs.find((s) => s.song_id === songId);
    if (!target) return;
    const ok = window.confirm(`¿Quitar "${target.title}" de la playlist?`);
    if (!ok) return;
    setSongs((prev) => prev.filter((s) => s.song_id !== songId));
    setDirty(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSongs((prev) => {
      const oldIndex = prev.findIndex((s) => s.song_id === active.id);
      const newIndex = prev.findIndex((s) => s.song_id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
    setDirty(true);
  }

  async function saveChanges() {
    setSaving(true);
    setError(null);
    const payload = {
      songs: songs.map((s, i) => ({
        song_id: s.song_id,
        position: i + 1,
        key_override: s.key_override,
      })),
    };
    try {
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "No se pudieron guardar los cambios.");
        setSaving(false);
        return;
      }
      setSongs((prev) => prev.map((s, i) => ({ ...s, position: i + 1 })));
      setDirty(false);
      setSaving(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red.");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Buscador para agregar */}
      <div className="rounded-xl border border-border bg-sidebar p-4">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-primary normal-case">
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
                  aria-label={`Agregar ${c.title}`}
                  title="Agregar a la playlist"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-white"
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={songs.map((s) => s.song_id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background">
              {songs.map((s) => (
                <SortableSongRow
                  key={s.song_id}
                  song={s}
                  onRemove={() => removeSong(s.song_id)}
                  onKeyOverrideChange={(ko) => setSongKeyOverride(s.song_id, ko)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {dirty && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="rounded-full border border-primary bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Grabando…" : "Grabar cambios"}
          </button>
        </div>
      )}
    </div>
  );
}

function SortableSongRow({
  song,
  onRemove,
  onKeyOverrideChange,
}: {
  song: SongInPlaylist;
  onRemove: () => void;
  onKeyOverrideChange: (keyOverride: string | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.song_id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const isUnpublished = song.status !== "published";
  const canTranspose =
    !isUnpublished && Boolean(song.original_key) && hasAnyChord(song.body);
  const semitones =
    canTranspose && song.original_key
      ? semitonesBetween(song.original_key, song.key_override ?? song.original_key) ?? 0
      : 0;

  function changeBy(delta: number) {
    if (!song.original_key) return;
    let next = semitones + delta;
    if (next > 6) next = -5;
    if (next < -5) next = 6;
    if (next === 0) {
      onKeyOverrideChange(null);
      return;
    }
    const newKey = transposeChord(song.original_key, next, "auto");
    onKeyOverrideChange(newKey);
  }

  function resetKey() {
    onKeyOverrideChange(null);
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-3 pl-1 pr-3"
    >
      <button
        type="button"
        aria-label="Arrastrar para reordenar"
        title="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
        className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center text-muted-foreground touch-none active:cursor-grabbing"
      >
        <DragHandleIcon />
      </button>
      <span
        className={`min-w-0 flex-1 truncate text-base ${
          isUnpublished ? "text-muted-foreground italic" : "text-primary"
        }`}
        title={isUnpublished ? "Canción no publicada" : undefined}
      >
        {song.number !== null ? `${song.number} · ${song.title}` : song.title}
        {isUnpublished && (
          <span className="ml-2 text-xs uppercase tracking-wide normal-case">
            (no publicada)
          </span>
        )}
      </span>
      {canTranspose && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => changeBy(-1)}
            aria-label="Bajar un semitono"
            title="Bajar un semitono"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-white"
          >
            <span className="text-sm font-semibold leading-none">♪−</span>
          </button>
          <button
            type="button"
            onClick={resetKey}
            disabled={semitones === 0}
            aria-label={
              semitones === 0 ? "Tono original" : "Restablecer tono original"
            }
            title={
              semitones === 0 ? "Tono original" : "Restablecer tono original"
            }
            className="min-w-10 rounded-full px-1 text-center text-xs normal-case text-muted-foreground transition-colors enabled:hover:text-primary disabled:cursor-default disabled:opacity-60"
          >
            {song.key_override ?? song.original_key}
          </button>
          <button
            type="button"
            onClick={() => changeBy(1)}
            aria-label="Subir un semitono"
            title="Subir un semitono"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-white"
          >
            <span className="text-sm font-semibold leading-none">♪+</span>
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${song.title}`}
        title="Quitar de la playlist"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent text-destructive transition-colors hover:border-destructive"
      >
        <TrashIcon />
      </button>
    </li>
  );
}
