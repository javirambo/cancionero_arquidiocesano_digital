"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import { SongTitle } from "@/app/components/song-title";
import { SongView } from "./song-view";
import { FavoriteHeartInline } from "./favorite-heart-inline";

type SongInPlaylist = {
  id: string;
  number: number | null;
  title: string;
  slug: string;
  body: string;
  original_key: string | null;
  youtube_url: string | null;
  categories: string[];
  author: string | null;
  hasFiles: boolean;
  imagePaths: string[];
  key_override: string | null;
  youtubeEmbed: string | null;
};

type Props = {
  songs: SongInPlaylist[];
  initialSlug: string;
  playlistId: string;
  homeHref: string;
};

const DIRECTION_LOCK_PX = 12;
const COMMIT_RATIO = 0.25;
const COMMIT_VELOCITY = 0.5;
const EDGE_RESISTANCE = 0.25;
const SLIDE_MS = 220;

type Drag = {
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  direction: "horizontal" | "vertical" | null;
};

export function PlaylistSongPager({ songs, initialSlug, playlistId, homeHref }: Props) {
  const plQuery = `?pl=${playlistId}`;

  const initialIndex = useMemo(() => {
    const i = songs.findIndex((s) => s.slug === initialSlug);
    return i >= 0 ? i : 0;
  }, [songs, initialSlug]);

  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const i = songs.findIndex((s) => s.slug === initialSlug);
    if (i >= 0 && i !== index) setIndex(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSlug]);

  const song = songs[index];
  const prev = index > 0 ? songs[index - 1] : null;
  const next = index < songs.length - 1 ? songs[index + 1] : null;

  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    setPortalReady(true);
  }, []);

  // dx = desplazamiento desde la posición centrada. Strip queda en -100% + dx.
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const dragRef = useRef<Drag | null>(null);
  const dxRef = useRef(0);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dxRef.current = dx;
  }, [dx]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = `/canciones/${song.slug}${plQuery}`;
    if (window.location.pathname + window.location.search !== target) {
      window.history.replaceState(null, "", target);
      document.title = song.title;
    }
  }, [song.slug, song.title, plQuery]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      dragRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        lastX: t.clientX,
        lastTime: performance.now(),
        velocity: 0,
        direction: null,
      };
      setAnimating(false);
    };

    const onTouchMove = (e: TouchEvent) => {
      const d = dragRef.current;
      if (!d || e.touches.length !== 1) return;
      const t = e.touches[0];
      const ddx = t.clientX - d.startX;
      const ddy = t.clientY - d.startY;

      if (d.direction === null) {
        if (Math.abs(ddx) < DIRECTION_LOCK_PX && Math.abs(ddy) < DIRECTION_LOCK_PX) {
          return;
        }
        d.direction = Math.abs(ddx) > Math.abs(ddy) ? "horizontal" : "vertical";
      }

      if (d.direction !== "horizontal") return;

      const target = e.target as HTMLElement | null;
      if (target?.closest('input[type="range"], audio, video, iframe, textarea')) {
        dragRef.current = null;
        setDx(0);
        return;
      }

      e.preventDefault();

      const now = performance.now();
      const dt = now - d.lastTime;
      if (dt > 0) {
        d.velocity = (t.clientX - d.lastX) / dt;
      }
      d.lastX = t.clientX;
      d.lastTime = now;

      let nextDx = ddx;
      if (ddx > 0 && !prev) nextDx = ddx * EDGE_RESISTANCE;
      if (ddx < 0 && !next) nextDx = ddx * EDGE_RESISTANCE;
      setDx(nextDx);
    };

    const onTouchEnd = () => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || d.direction !== "horizontal") {
        setDx(0);
        return;
      }

      const width = window.innerWidth || 1;
      const cur = dxRef.current;
      const ratio = Math.abs(cur) / width;
      const fastEnough = Math.abs(d.velocity) >= COMMIT_VELOCITY;
      const shouldCommit = ratio >= COMMIT_RATIO || fastEnough;

      setAnimating(true);

      if (shouldCommit && cur > 0 && prev) {
        setDx(width);
        window.setTimeout(() => {
          setAnimating(false);
          setDx(0);
          setIndex((i) => i - 1);
          window.scrollTo({ top: 0, behavior: "auto" });
        }, SLIDE_MS);
        return;
      }
      if (shouldCommit && cur < 0 && next) {
        setDx(-width);
        window.setTimeout(() => {
          setAnimating(false);
          setDx(0);
          setIndex((i) => i + 1);
          window.scrollTo({ top: 0, behavior: "auto" });
        }, SLIDE_MS);
        return;
      }

      setDx(0);
    };

    const onTouchCancel = () => {
      dragRef.current = null;
      setAnimating(true);
      setDx(0);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchCancel);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [prev, next]);

  if (!song) return null;

  return (
    <div
      className="relative"
      style={{
        // Salir del padding del <main> para que cada panel ocupe 100vw real.
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        overflow: "hidden",
      }}
    >
      <div
        ref={stripRef}
        className="flex"
        style={{
          width: "300vw",
          transform: `translate3d(calc(-100vw + ${dx}px), 0, 0)`,
          transition: animating ? `transform ${SLIDE_MS}ms ease-out` : "none",
          willChange: "transform",
          touchAction: "pan-y",
        }}
      >
        <Panel song={prev} plQuery={plQuery} songs={songs} homeHref={homeHref} />
        <Panel song={song} plQuery={plQuery} songs={songs} homeHref={homeHref} isCurrent />
        <Panel song={next} plQuery={plQuery} songs={songs} homeHref={homeHref} />
      </div>
      {portalReady &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-between px-4">
            {prev ? (
              <Link
                href={`/canciones/${prev.slug}${plQuery}`}
                onPointerDown={(e) => {
                const el = e.currentTarget;
                el.classList.remove("tap-flash");
                void el.offsetWidth;
                el.classList.add("tap-flash");
              }}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition-opacity focus:outline-none hover:opacity-90"
              style={{ backgroundColor: "#436bb0" }}
              >
                <span aria-hidden="true">◀</span>
                Anterior
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/canciones/${next.slug}${plQuery}`}
                onPointerDown={(e) => {
                const el = e.currentTarget;
                el.classList.remove("tap-flash");
                void el.offsetWidth;
                el.classList.add("tap-flash");
              }}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition-opacity focus:outline-none hover:opacity-90"
              style={{ backgroundColor: "#436bb0" }}
              >
                Siguiente
                <span aria-hidden="true">▶</span>
              </Link>
            ) : (
              <span />
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

function Panel({
  song,
  plQuery,
  songs,
  homeHref,
  isCurrent = false,
}: {
  song: SongInPlaylist | null;
  plQuery: string;
  songs: SongInPlaylist[];
  homeHref: string;
  isCurrent?: boolean;
}) {
  if (!song) {
    return (
      <div
        style={{ width: "100vw", flex: "0 0 100vw", overflowX: "hidden" }}
        aria-hidden
      />
    );
  }
  return (
    <div
      style={{ width: "100vw", flex: "0 0 100vw", overflowX: "hidden" }}
      aria-hidden={!isCurrent}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col px-4">
        <SongView
          key={song.id}
          songId={song.id}
          songSlug={song.slug}
          songTitle={song.title}
          body={song.body}
          originalKey={song.original_key}
          youtubeEmbed={song.youtubeEmbed}
          hasFiles={song.hasFiles}
          imagePaths={song.imagePaths}
          playlistKeyOverride={song.key_override}
          inPlaylistContext
          homeHref={homeHref}
          hideToolbar={!isCurrent}
          titleSlot={
            <header className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-secondary">
                  {song.number !== null ? `Nº ${song.number}` : "Canto"}
                </p>
                {song.categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-secondary bg-card px-2 py-px text-[10px] uppercase tracking-wide text-secondary"
                  >
                    {c}
                  </span>
                ))}
                {isCurrent && (
                  <span className="ml-auto">
                    <FavoriteHeartInline
                      songId={song.id}
                      songTitle={song.title}
                      songSlug={song.slug}
                      subtitle={song.categories.join(" · ") || undefined}
                    />
                  </span>
                )}
              </div>
              <SongTitle
                title={song.title}
                className="text-3xl leading-tight text-song-title"
              />
              {song.author && (
                <p className="text-sm normal-case text-muted-foreground">
                  Autor: {song.author}
                </p>
              )}
            </header>
          }
        />

      </div>
    </div>
  );
}
