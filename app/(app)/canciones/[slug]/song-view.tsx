"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  detectSystem,
  hasAnyChord,
  parseBody,
  semitonesBetween,
  transposeLine,
  type ChordLine,
  type ChordSystem,
} from "@/lib/chordpro";
import { useFavorites } from "@/app/components/favorites";
import { useSession } from "@/app/components/session";
import { useUserRoles } from "@/app/components/user-roles";
import { createClient } from "@/lib/supabase/client";
import { DownloadFilesMenu } from "@/app/components/download-files-menu";
import { PlayMenu } from "@/app/components/play-menu";
import { groupChorus, LineView } from "@/app/components/song-render";
import {
  useLetterScale,
  LETTER_SCALE_MIN,
  LETTER_SCALE_MAX,
  LETTER_SCALE_STEP,
} from "@/app/components/letter-scale";
import { usePreferences } from "@/app/components/preferences";

type Props = {
  songId: string;
  songSlug: string;
  songTitle: string;
  body: string;
  originalKey: string | null;
  youtubeEmbed: string | null;
  hasFiles: boolean;
  playlistKeyOverride?: string | null;
  inPlaylistContext?: boolean;
  hideToolbar?: boolean;
};

const STORAGE_KEY_PREFIX = "song:transpose:";

export function SongView({
  songId,
  songSlug,
  songTitle,
  body,
  originalKey,
  youtubeEmbed,
  hasFiles,
  playlistKeyOverride = null,
  inPlaylistContext = false,
  hideToolbar = false,
}: Props) {
  const lines = useMemo(() => parseBody(body), [body]);
  const chordsExist = useMemo(() => hasAnyChord(body), [body]);
  const { isAuthenticated } = useFavorites();
  const { user } = useSession();
  const { isAdmin, isEditor } = useUserRoles();
  const canEdit = isAdmin || isEditor;
  // CU-03: el invitado también ve acordes y puede transponer; la
  // transposición se persiste en localStorage (CU-03). Solo se oculta
  // cuando la canción no tiene acordes definidos.
  const chordsAvailable = chordsExist;


  const { showChords, setPreference } = usePreferences();
  const toggleShowChords = () => {
    void setPreference("showChords", !showChords);
  };
  const [media, setMedia] = useState<
    | { type: "youtube" }
    | { type: "audio"; src: string; label: string }
    | null
  >(null);
  const [semitones, setSemitones] = useState(0);
  const { scale: letterScale, adjust: adjustLetterScale } = useLetterScale();

  const [autoScrollOpen, setAutoScrollOpen] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(4);
  const scrollSpeedRef = useRef(scrollSpeed);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    scrollSpeedRef.current = scrollSpeed;
  }, [scrollSpeed]);

  useEffect(() => {
    if (!autoScrollOpen) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    let acc = 0;
    const step = () => {
      acc += scrollSpeedRef.current * 0.03;
      if (acc >= 1) {
        const px = Math.floor(acc);
        window.scrollBy(0, px);
        acc -= px;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [autoScrollOpen]);

  const toggleAutoScroll = () => setAutoScrollOpen((v) => !v);
  const detected = useMemo<"latin" | "english">(
    () => detectSystem(lines),
    [lines]
  );
  const [system, setSystem] = useState<ChordSystem>("auto");
  // Sistema efectivo: "auto" usa el detectado.
  const effectiveSystem: "latin" | "english" =
    system === "auto" ? detected : (system as "latin" | "english");

  // Hidratado: evita que el guardado se dispare antes de cargar el valor inicial.
  const [hydrated, setHydrated] = useState(false);

  // Carga inicial del tono (CU-03 precedencia):
  //   1) Contexto playlist: usa key_override (en sesión, sin persistencia).
  //   2) Usuario logueado: user_song_keys.
  //   3) Anónimo: localStorage.
  //   4) Default: 0.
  useEffect(() => {
    if (!chordsExist) {
      setHydrated(true);
      return;
    }
    if (inPlaylistContext) {
      const off = semitonesBetween(originalKey, playlistKeyOverride);
      setSemitones(off ?? 0);
      setHydrated(true);
      return;
    }
    let cancelled = false;
    const userId = user?.id;
    (async () => {
      if (userId) {
        const supabase = createClient();
        const { data } = await supabase
          .from("user_song_keys")
          .select("semitones")
          .eq("user_id", userId)
          .eq("song_id", songId)
          .maybeSingle();
        if (cancelled) return;
        if (data && Number.isFinite(data.semitones)) {
          setSemitones(data.semitones);
          setHydrated(true);
          return;
        }
      }
      const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + songId);
      if (raw !== null) {
        const n = Number.parseInt(raw, 10);
        if (Number.isFinite(n)) setSemitones(n);
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [songId, chordsExist, user?.id, inPlaylistContext, originalKey, playlistKeyOverride]);

  // Guardado: en contexto playlist NO persistir. Logueado → BD; anónimo → localStorage.
  useEffect(() => {
    if (!chordsExist || !hydrated || inPlaylistContext) return;
    const userId = user?.id;
    if (!userId) {
      window.localStorage.setItem(STORAGE_KEY_PREFIX + songId, String(semitones));
      return;
    }
    const t = window.setTimeout(() => {
      const supabase = createClient();
      void supabase
        .from("user_song_keys")
        .upsert(
          { user_id: userId, song_id: songId, semitones },
          { onConflict: "user_id,song_id" }
        );
    }, 400);
    return () => window.clearTimeout(t);
  }, [songId, semitones, chordsExist, hydrated, user?.id, inPlaylistContext]);

  const transposed: ChordLine[] = useMemo(
    () => lines.map((l) => transposeLine(l, semitones, system)),
    [lines, semitones, system]
  );

  const chordsDisabled = !chordsAvailable;

  return (
    <div className="flex flex-col gap-6">
      {!hideToolbar && (
      <div
        role="toolbar"
        aria-label="Controles de la canción"
        className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-sidebar px-2 py-3 sm:justify-end sm:gap-3 sm:px-4"
      >
        {chordsAvailable && (
          <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleShowChords}
          aria-pressed={showChords}
          aria-label={showChords ? "Ocultar acordes" : "Mostrar acordes"}
          title={showChords ? "Ocultar acordes" : "Mostrar acordes"}
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-primary transition-colors ${
            showChords
              ? "bg-primary text-white hover:bg-primary-hover"
              : "text-primary hover:bg-primary hover:text-white"
          }`}
        >
          <span className="text-lg leading-none">🎸</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setSystem(effectiveSystem === "latin" ? "english" : "latin")
          }
          disabled={!showChords}
          title={
            effectiveSystem === "latin"
              ? "Cambiar a cifrado americano (C, D, E…)"
              : "Cambiar a cifrado latino (Do, Re, Mi…)"
          }
          aria-label="Cambiar sistema de cifrado"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors enabled:hover:bg-primary enabled:hover:text-white disabled:border-border disabled:text-muted-foreground disabled:opacity-50"
        >
          <span className="text-sm font-semibold leading-none">
            {effectiveSystem === "latin" ? "Do" : "C"}
          </span>
        </button>

        <div
          className="flex items-center gap-0.5"
          aria-label="Transposición"
          title={
            inPlaylistContext && playlistKeyOverride
              ? "Tono sugerido por la playlist"
              : undefined
          }
        >
          {inPlaylistContext && playlistKeyOverride && (
            <span
              aria-hidden="true"
              className="mr-0.5 text-xs text-secondary"
              title="Tono sugerido por la playlist"
            >
              ★
            </span>
          )}
          <button
            type="button"
            onClick={() => setSemitones((s) => (s <= -5 ? 6 : s - 1))}
            disabled={!showChords}
            aria-label="Bajar un semitono"
            title="Bajar un semitono"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors enabled:hover:bg-primary enabled:hover:text-white disabled:border-border disabled:text-muted-foreground disabled:opacity-50"
          >
            <span className="text-base font-semibold leading-none">♪−</span>
          </button>
          <button
            type="button"
            onClick={() => semitones !== 0 && setSemitones(0)}
            disabled={!showChords || semitones === 0}
            aria-label={
              semitones === 0
                ? "Tono original"
                : "Restablecer tono original"
            }
            title={
              semitones === 0 ? "Tono original" : "Restablecer tono original"
            }
            className="min-w-8 rounded-full px-1 text-center text-sm normal-case text-muted-foreground transition-colors enabled:hover:text-primary disabled:cursor-default disabled:opacity-50"
          >
            {semitones === 0
              ? originalKey ?? "Tono"
              : `${semitones > 0 ? "+" : ""}${semitones}`}
          </button>
          <button
            type="button"
            onClick={() => setSemitones((s) => (s >= 6 ? -5 : s + 1))}
            disabled={!showChords}
            aria-label="Subir un semitono"
            title="Subir un semitono"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors enabled:hover:bg-primary enabled:hover:text-white disabled:border-border disabled:text-muted-foreground disabled:opacity-50"
          >
            <span className="text-base font-semibold leading-none">♪+</span>
          </button>
        </div>
          </div>
        )}

        <div className="flex w-full basis-full items-center justify-end gap-2 sm:ml-auto sm:w-auto sm:basis-auto sm:gap-3">
          <button
            type="button"
            onClick={() => adjustLetterScale(-LETTER_SCALE_STEP)}
            disabled={letterScale <= LETTER_SCALE_MIN}
            aria-label="Reducir tamaño de letra"
            title="Reducir tamaño de letra"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary"
          >
            <span className="text-base font-semibold leading-none">A−</span>
          </button>
          <button
            type="button"
            onClick={() => adjustLetterScale(LETTER_SCALE_STEP)}
            disabled={letterScale >= LETTER_SCALE_MAX}
            aria-label="Ampliar tamaño de letra"
            title="Ampliar tamaño de letra"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary"
          >
            <span className="text-base font-semibold leading-none">A+</span>
          </button>
          <button
            type="button"
            onClick={toggleAutoScroll}
            aria-pressed={autoScrollOpen}
            aria-label={
              autoScrollOpen
                ? "Detener desplazamiento automático"
                : "Iniciar desplazamiento automático"
            }
            title={
              autoScrollOpen
                ? "Detener desplazamiento automático"
                : "Desplazamiento automático"
            }
            className={`flex h-10 w-10 items-center justify-center rounded-full border border-primary transition-colors ${
              autoScrollOpen
                ? "bg-primary text-white hover:bg-primary-hover"
                : "text-primary hover:bg-primary hover:text-white"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
          </button>
          <PlayMenu
            songId={songId}
            songTitle={songTitle}
            youtubeEmbed={youtubeEmbed}
            hasFiles={hasFiles}
            selection={media}
            onSelect={setMedia}
          />
          <DownloadFilesMenu
            songId={songId}
            songTitle={songTitle}
            print={{
              slug: songSlug,
              canPrintWithChords: chordsAvailable,
              semitones,
              system,
            }}
          />
          {canEdit && (
            <Link
              href={`/admin/canciones/${songId}/editar`}
              aria-label="Editar canto"
              title="Editar canto"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </Link>
          )}
        </div>
      </div>
      )}

      {media?.type === "youtube" && youtubeEmbed && (
        youtubeEmbed.includes("open.spotify.com") ? (
          <div className="w-full overflow-hidden rounded-xl border border-border">
            <iframe
              src={youtubeEmbed}
              title="Reproductor de Spotify"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              loading="lazy"
              className="w-full"
              style={{ height: 152 }}
            />
          </div>
        ) : (
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
            <iframe
              src={youtubeEmbed}
              title="Reproductor de YouTube"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        )
      )}

      {media?.type === "audio" && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-sidebar px-4 py-3">
          <span className="truncate text-sm text-muted-foreground">
            {media.label}
          </span>
          <audio
            controls
            autoPlay
            src={media.src}
            className="w-full"
            aria-label="Reproductor de audio"
          />
        </div>
      )}

      <div
        className="font-serif text-base normal-case text-foreground"
        style={{ fontSize: `${letterScale}rem`, lineHeight: 1.6 }}
      >
        {groupChorus(transposed).map((block, i) =>
          block.inChorus ? (
            <div
              key={i}
              className="my-2 border-l-[3px] border-song-title pl-2 font-bold"
            >
              {block.lines.map((line, j) => (
                <LineView
                  key={j}
                  line={line}
                  showChords={showChords && !chordsDisabled}
                />
              ))}
            </div>
          ) : (
            <div key={i}>
              {block.lines.map((line, j) => (
                <LineView
                  key={j}
                  line={line}
                  showChords={showChords && !chordsDisabled}
                />
              ))}
            </div>
          )
        )}
      </div>

      {autoScrollOpen && (
        <div
          role="dialog"
          aria-label="Velocidad de desplazamiento"
          className="fixed bottom-4 right-4 z-30 flex flex-col items-center gap-2 rounded-xl border border-primary bg-sidebar px-3 py-4 shadow-lg"
        >
          <span className="text-xs font-semibold text-muted-foreground">
            Vel.
          </span>
          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={scrollSpeed}
            onChange={(e) => setScrollSpeed(Number(e.target.value))}
            aria-label="Velocidad de desplazamiento"
            aria-orientation="vertical"
            className="accent-primary"
            style={{
              writingMode: "vertical-lr",
              direction: "rtl",
              width: 24,
              height: 140,
            }}
          />
          <span className="w-4 text-center text-sm font-semibold text-primary">
            {scrollSpeed}
          </span>
        </div>
      )}
    </div>
  );
}
