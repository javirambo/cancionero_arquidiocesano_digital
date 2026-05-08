"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CloseIcon, HeartIcon } from "./icons";
import { useFavorites, type FavoriteEntry, type FavoriteKind } from "./favorites";

type Props = {
  open: boolean;
  onClose: () => void;
};

const GROUP_LABELS: Record<FavoriteKind, string> = {
  song: "Cantos",
  playlist: "Listas",
  parish: "Parroquias",
};

const GROUP_ORDER: FavoriteKind[] = ["song", "playlist", "parish"];

const PRECACHE_STORAGE_KEY = "pwa-precache:favorites-bundle";

type DownloadStatus = "idle" | "loading" | "done" | "partial" | "error";

function slugFromHref(href: string): string | null {
  const match = href.match(/^\/canciones\/([^/?#]+)/);
  return match ? match[1] : null;
}

export function FavoritesDialog({ open, onClose }: Props) {
  const { favorites, remove, loading } = useFavorites();
  const [swReady, setSwReady] = useState(false);
  const [persistedAt, setPersistedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // Cerrar con ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Estado del SW + última descarga al abrir el dialog.
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setSwReady(Boolean(reg?.active));
      });
    }
    setPersistedAt(localStorage.getItem(PRECACHE_STORAGE_KEY));
  }, [open]);

  const grouped = useMemo(() => {
    const out: Record<FavoriteKind, FavoriteEntry[]> = {
      song: [],
      playlist: [],
      parish: [],
    };
    for (const f of favorites) out[f.kind].push(f);
    return out;
  }, [favorites]);

  async function handleDownload() {
    setStatus("loading");

    // 1. Slugs de canciones favoritas directas.
    const songSlugs = grouped.song
      .map((f) => slugFromHref(f.href))
      .filter((s): s is string => Boolean(s));

    // 2. Slugs de canciones dentro de playlists favoritas.
    const playlistIds = grouped.playlist.map((f) => f.id);
    const playlistSongSlugs: string[] = [];
    for (const plId of playlistIds) {
      try {
        const res = await fetch(`/api/playlists/${plId}/song-slugs`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { songs: { id: string; slug: string }[] };
          for (const s of data.songs) {
            if (s.slug) playlistSongSlugs.push(s.slug);
          }
        }
      } catch {
        // continuamos con la siguiente playlist
      }
    }

    // 3. Dedupe por slug.
    const allSlugs = Array.from(new Set([...songSlugs, ...playlistSongSlugs]));

    if (allSlugs.length === 0) {
      setStatus("idle");
      return;
    }

    setProgress({ done: 0, total: allSlugs.length });

    // 4. Descargar en serie (forzando red para que el SW capture la respuesta).
    let okCount = 0;
    for (const slug of allSlugs) {
      try {
        const res = await fetch(`/canciones/${slug}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (res.ok) okCount++;
      } catch {
        // seguimos con la siguiente
      }
      setProgress((p) => ({ done: p.done + 1, total: p.total }));
    }

    if (okCount === allSlugs.length) {
      const ts = new Date().toISOString();
      localStorage.setItem(PRECACHE_STORAGE_KEY, ts);
      setPersistedAt(ts);
      setStatus("done");
    } else if (okCount > 0) {
      setStatus("partial");
    } else {
      setStatus("error");
    }
  }

  if (!open) return null;

  const showDownload =
    swReady && (grouped.song.length > 0 || grouped.playlist.length > 0);

  const buttonClass =
    "rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60";

  function buttonLabel(): string {
    if (status === "loading") {
      return `Descargando ${progress.done} / ${progress.total}…`;
    }
    if (status === "partial") return "Descarga parcial · Reintentar";
    if (status === "error") return "Error al descargar · Reintentar";
    if (persistedAt || status === "done") return "Actualizar favoritos";
    return "Descargar favoritos";
  }

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
          {loading ? (
            <p className="px-6 py-10 text-center text-sm normal-case text-muted-foreground">
              Cargando…
            </p>
          ) : favorites.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm normal-case text-muted-foreground">
              Seleccioná canciones o playlists para guardar en tus favoritos.
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
                        className="flex flex-1 items-baseline gap-3"
                      >
                        <span className="flex-1 truncate text-base text-primary">
                          {f.kind === "song" && f.number != null
                            ? `${f.number} · ${f.title}`
                            : f.title}
                        </span>
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

        {showDownload && (
          <div className="flex flex-col items-center gap-1 border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={status === "loading"}
              className={buttonClass}
            >
              {buttonLabel()}
            </button>
            {persistedAt && status !== "loading" && (
              <span className="text-xs normal-case text-muted-foreground">
                Última descarga:{" "}
                {new Date(persistedAt).toLocaleString("es-AR")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
