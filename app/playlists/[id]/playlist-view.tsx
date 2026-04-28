"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlaylistWithSongs } from "@/lib/playlists";
import { SongRow } from "@/app/components/song-row";

type Sort =
  | "custom"
  | "number"
  | "title"
  | "category"
  | "author"
  | "added";

const SORT_LABELS: Record<Sort, string> = {
  custom: "Orden personalizado",
  number: "Número",
  title: "Título",
  category: "Categoría",
  author: "Autor",
  added: "Agregado recientemente",
};

const SORT_ORDER: Sort[] = ["custom", "number", "title", "category", "author", "added"];

type Props = {
  playlist: PlaylistWithSongs;
};

export function PlaylistView({ playlist }: Props) {
  const [sort, setSort] = useState<Sort>("custom");

  useEffect(() => {
    const raw = window.localStorage.getItem(`pl:sort:${playlist.id}`);
    if (raw && SORT_ORDER.includes(raw as Sort)) setSort(raw as Sort);
  }, [playlist.id]);

  useEffect(() => {
    window.localStorage.setItem(`pl:sort:${playlist.id}`, sort);
  }, [sort, playlist.id]);

  const sorted = useMemo(() => {
    const arr = [...playlist.songs];
    const cmp = (() => {
      switch (sort) {
        case "custom":
          return (a: typeof arr[0], b: typeof arr[0]) => a.position - b.position;
        case "number":
          return (a: typeof arr[0], b: typeof arr[0]) =>
            (a.number ?? Number.POSITIVE_INFINITY) -
            (b.number ?? Number.POSITIVE_INFINITY);
        case "title":
          return (a: typeof arr[0], b: typeof arr[0]) =>
            a.title.localeCompare(b.title, "es");
        case "category":
          return (a: typeof arr[0], b: typeof arr[0]) =>
            (a.category ?? "").localeCompare(b.category ?? "", "es");
        case "author":
          return (a: typeof arr[0], b: typeof arr[0]) =>
            (a.author ?? "").localeCompare(b.author ?? "", "es");
        case "added":
          return (a: typeof arr[0], b: typeof arr[0]) =>
            b.created_at.localeCompare(a.created_at);
      }
    })();
    arr.sort(cmp);
    return arr;
  }, [playlist.songs, sort]);

  return (
    <>
      <Toolbar title={playlist.name} sort={sort} onSort={setSort} />

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-border bg-sidebar p-6 text-base normal-case text-muted-foreground">
          Esta playlist todavía no tiene canciones.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-border rounded-xl border border-border bg-background">
          {sorted.map((s, i) => (
            <SongRow
              key={s.id}
              index={i + 1}
              song={s}
              playlistContext={{ playlistId: playlist.id, canManage: false }}
            />
          ))}
        </ol>
      )}
    </>
  );
}

function Toolbar({
  title,
  sort,
  onSort,
}: {
  title: string;
  sort: Sort;
  onSort: (s: Sort) => void;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

  return (
    <div
      role="toolbar"
      aria-label={`Acciones de la playlist ${title}`}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-sidebar px-3 py-2"
    >
      <div ref={sortRef} className="relative">
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          title={`Orden actual: ${SORT_LABELS[sort]}`}
          aria-haspopup="menu"
          aria-expanded={sortOpen}
          className="rounded-full border border-border bg-background px-4 py-1.5 text-sm uppercase tracking-wide text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Ordenar
        </button>
        {sortOpen && (
          <div
            role="menu"
            className="absolute left-0 top-10 z-30 w-56 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
          >
            <ul className="py-1 text-sm">
              {SORT_ORDER.map((s) => {
                const active = s === sort;
                return (
                  <li key={s}>
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => {
                        onSort(s);
                        setSortOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left normal-case transition-colors hover:bg-sidebar ${
                        active ? "text-primary" : "text-foreground"
                      }`}
                    >
                      <span>{SORT_LABELS[s]}</span>
                      {active && <span aria-hidden="true">✓</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
