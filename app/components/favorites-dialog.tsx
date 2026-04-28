"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { CloseIcon, HeartIcon } from "./icons";
import { useFavorites, type FavoriteEntry, type FavoriteKind } from "./favorites";

type Props = {
  open: boolean;
  onClose: () => void;
};

const GROUP_LABELS: Record<FavoriteKind, string> = {
  song: "Canciones",
  playlist: "Playlists",
  parish: "Parroquias",
};

const GROUP_ORDER: FavoriteKind[] = ["song", "playlist", "parish"];

export function FavoritesDialog({ open, onClose }: Props) {
  const { favorites, remove } = useFavorites();

  // Cerrar con ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const grouped = useMemo(() => {
    const out: Record<FavoriteKind, FavoriteEntry[]> = {
      song: [],
      playlist: [],
      parish: [],
    };
    // Ya viene ordenado por added_at desc desde el provider.
    for (const f of favorites) out[f.kind].push(f);
    return out;
  }, [favorites]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mis favoritos"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-border px-5 py-3">
          <span className="text-primary">
            <HeartIcon filled />
          </span>
          <h2 className="flex-1 text-lg">Mis favoritos</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:text-primary"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="max-h-[60vh] overflow-y-auto">
          {favorites.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm normal-case text-muted-foreground">
              Todavía no marcaste favoritos. Tocá el ❤ de una canción, playlist o
              parroquia para guardarla acá.
            </p>
          ) : (
            GROUP_ORDER.filter((k) => grouped[k].length > 0).map((kind) => (
              <section key={kind}>
                <h3 className="border-b border-border bg-sidebar px-5 py-2 text-xs uppercase tracking-[0.2em] text-secondary">
                  {GROUP_LABELS[kind]}
                </h3>
                <ul className="divide-y divide-border">
                  {grouped[kind].map((f) => (
                    <li
                      key={`${f.kind}-${f.id}`}
                      className="flex items-center gap-2 px-5 py-3"
                    >
                      <Link
                        href={f.href}
                        onClick={onClose}
                        className="flex flex-1 flex-col gap-0.5"
                      >
                        <span className="text-base text-primary">{f.title}</span>
                        {f.subtitle && (
                          <span className="text-xs normal-case text-muted-foreground">
                            {f.subtitle}
                          </span>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(f.kind, f.id)}
                        title="Quitar de favoritos"
                        aria-label="Quitar de favoritos"
                        className="text-primary hover:text-primary-hover"
                      >
                        <HeartIcon filled />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
