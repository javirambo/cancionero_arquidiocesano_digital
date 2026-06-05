"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  detectSystem,
  hasAnyChord,
  parseBody,
  semitonesBetween,
  transposeChord,
  transposeLine,
  type ChordLine,
  type ChordSystem,
} from "@/lib/chordpro";
import { useFavorites } from "@/app/components/favorites";
import { useSession } from "@/app/components/session";
import { useUserRoles } from "@/app/components/user-roles";
import { createClient } from "@/lib/supabase/client";
import { groupChorus, LineView } from "@/app/components/song-render";
import {
  useLetterScale,
  LETTER_SCALE_MIN,
  LETTER_SCALE_MAX,
  LETTER_SCALE_STEP,
} from "@/app/components/letter-scale";
import { usePreferences } from "@/app/components/preferences";
import { useTheme } from "@/app/components/theme";
import { useWakeLock } from "@/app/components/wake-lock";
import { YoutubeIcon, SpeakerIcon, ShareIcon } from "@/app/components/icons";
import { QrDialog } from "@/app/components/qr-button";
import { SearchFab } from "@/app/components/search-fab";

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
  titleSlot?: React.ReactNode;
};

const STORAGE_KEY_PREFIX = "song:transpose:";
const HEADER_BG = "#436bb0";

// Dispara un flash visual de ~220ms al tocar un botón (definido en globals.css
// como `.tap-flash` + keyframe `tap-flash`). Quita y re-agrega la clase para
// reanimar en taps rápidos.
function flashButton(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.classList.remove("tap-flash");
  // Forzar reflow para reiniciar la animación.
  void el.offsetWidth;
  el.classList.add("tap-flash");
}

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
  titleSlot,
}: Props) {
  const lines = useMemo(() => parseBody(body), [body]);
  const chordsExist = useMemo(() => hasAnyChord(body), [body]);
  const { isAuthenticated } = useFavorites();
  const { user } = useSession();
  const { isAdmin, isEditor } = useUserRoles();
  const canEdit = isAdmin || isEditor;
  const chordsAvailable = chordsExist;

  const { showChords, scrollSpeed: persistedSpeed, setPreference } =
    usePreferences();
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

  const [autoScrollOn, setAutoScrollOn] = useState(false);
  const scrollSpeed = persistedSpeed;
  const setScrollSpeed = (n: number) => {
    void setPreference("scrollSpeed", n);
  };
  const scrollSpeedRef = useRef(scrollSpeed);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    scrollSpeedRef.current = scrollSpeed;
  }, [scrollSpeed]);

  useEffect(() => {
    if (!autoScrollOn) {
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
  }, [autoScrollOn]);

  const detected = useMemo<"latin" | "english">(
    () => detectSystem(lines),
    [lines]
  );
  const [system, setSystem] = useState<ChordSystem>("auto");
  const effectiveSystem: "latin" | "english" =
    system === "auto" ? detected : (system as "latin" | "english");

  const [hydrated, setHydrated] = useState(false);

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

  const [portalReady, setPortalReady] = useState(false);
  useEffect(() => {
    setPortalReady(true);
  }, []);

  const toolbarEl = !hideToolbar ? (
    <SongToolbar
      songId={songId}
      songSlug={songSlug}
      songTitle={songTitle}
      chordsAvailable={chordsAvailable}
      showChords={showChords}
      toggleShowChords={toggleShowChords}
      effectiveSystem={effectiveSystem}
      setSystem={setSystem}
      semitones={semitones}
      setSemitones={setSemitones}
      originalKey={originalKey}
      inPlaylistContext={inPlaylistContext}
      playlistKeyOverride={playlistKeyOverride}
      letterScale={letterScale}
      adjustLetterScale={adjustLetterScale}
      system={system}
      hasFiles={hasFiles}
      youtubeEmbed={youtubeEmbed}
      media={media}
      setMedia={setMedia}
      canEdit={canEdit}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      {/*
        En contexto playlist el toolbar va por portal a document.body para
        escapar del strip transformado del pager (un transform crea
        containing-block para descendientes `fixed`). En el flujo dejamos un
        placeholder h-14 que reserva el espacio y mantiene el título alineado
        entre el panel actual y los paneles laterales del swipe.
      */}
      {inPlaylistContext ? (
        <>
          <div aria-hidden="true" className="h-14" />
          {portalReady && toolbarEl && createPortal(toolbarEl, document.body)}
        </>
      ) : !hideToolbar ? (
        toolbarEl
      ) : (
        <div aria-hidden="true" className="h-14" />
      )}
      {titleSlot}

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

      {!hideToolbar && portalReady && createPortal(
        <AutoScrollPanel
          on={autoScrollOn}
          toggle={() => setAutoScrollOn((v) => !v)}
          speed={scrollSpeed}
          setSpeed={setScrollSpeed}
        />,
        document.body
      )}

      {portalReady && createPortal(<SearchFab />, document.body)}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Toolbar                                                                    */
/* -------------------------------------------------------------------------- */

type ToolbarProps = {
  songId: string;
  songSlug: string;
  songTitle: string;
  chordsAvailable: boolean;
  showChords: boolean;
  toggleShowChords: () => void;
  effectiveSystem: "latin" | "english";
  setSystem: (s: ChordSystem) => void;
  semitones: number;
  setSemitones: (fn: (s: number) => number) => void;
  originalKey: string | null;
  inPlaylistContext: boolean;
  playlistKeyOverride: string | null;
  letterScale: number;
  adjustLetterScale: (delta: number) => void;
  system: ChordSystem;
  hasFiles: boolean;
  youtubeEmbed: string | null;
  media:
    | { type: "youtube" }
    | { type: "audio"; src: string; label: string }
    | null;
  setMedia: (
    m:
      | { type: "youtube" }
      | { type: "audio"; src: string; label: string }
      | null
  ) => void;
  canEdit: boolean;
};

function SongToolbar({
  songId,
  songSlug,
  songTitle,
  chordsAvailable,
  showChords,
  toggleShowChords,
  effectiveSystem,
  setSystem,
  semitones,
  setSemitones,
  originalKey,
  inPlaylistContext,
  playlistKeyOverride,
  letterScale,
  adjustLetterScale,
  system,
  hasFiles,
  youtubeEmbed,
  media,
  setMedia,
  canEdit,
}: ToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Controles de la canción"
      style={{ backgroundColor: HEADER_BG }}
      className={
        inPlaylistContext
          ? "fixed inset-x-0 top-0 z-40 flex flex-col gap-2 border-b border-white/20 px-3 py-2 sm:px-4"
          : "sticky top-0 z-20 -mx-4 flex flex-col gap-2 border-b border-white/20 px-3 py-2 sm:-mx-0 sm:rounded-xl sm:px-4"
      }
    >
      {/* Fila superior */}
      <div className="flex flex-nowrap items-center justify-between gap-1">
        <div className="flex flex-nowrap items-center gap-1">
          <div
            className={`flex flex-nowrap items-center justify-start transition-all duration-300 ease-out ${
              showChords ? "gap-1" : "gap-0"
            } ${chordsAvailable ? "" : "hidden"}`}
            aria-hidden={!chordsAvailable}
          >
            <ChordsCycleButton
              showChords={showChords}
              effectiveSystem={effectiveSystem}
              originalKey={originalKey}
              semitones={semitones}
              onCycle={() => {
                // Off → Latín On → Inglés On → Off
                if (!showChords) {
                  toggleShowChords();
                  setSystem("latin");
                  return;
                }
                if (effectiveSystem === "latin") {
                  setSystem("english");
                  return;
                }
                toggleShowChords();
              }}
            />

            {/* Controles de transposición: ocultos cuando los acordes están
                apagados; al encenderlos se despliegan deslizándose hacia la
                derecha desde el botón de acordes. */}
            <div
              className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${
                showChords
                  ? "max-w-[220px] translate-x-0 opacity-100"
                  : "pointer-events-none max-w-0 -translate-x-3 opacity-0"
              }`}
              aria-hidden={!showChords}
            >
              <div
                className="flex items-center gap-0.5"
                aria-label="Transposición"
              >
                {inPlaylistContext && playlistKeyOverride && (
                  <span
                    aria-hidden="true"
                    className="mr-0.5 text-xs text-white/90"
                    title="Tono sugerido por la playlist"
                  >
                    ★
                  </span>
                )}
                <ToolbarButton
                  onClick={() => setSemitones((s) => (s <= -5 ? 6 : s - 1))}
                  disabled={!showChords}
                  label="Bajar un semitono"
                >
                  <span className="text-base font-semibold leading-none">
                    ♪−
                  </span>
                </ToolbarButton>
                <button
                  type="button"
                  onClick={() => semitones !== 0 && setSemitones(() => 0)}
                  disabled={!showChords || semitones === 0}
                  aria-label={
                    semitones === 0
                      ? "Tono original"
                      : "Restablecer tono original"
                  }
                  title={
                    semitones === 0
                      ? "Tono original"
                      : "Restablecer tono original"
                  }
                  className="min-w-8 rounded-full px-1 text-center text-sm normal-case text-white transition-opacity disabled:opacity-60"
                >
                  {semitones === 0
                    ? originalKey
                      ? transposeChord(originalKey, 0, effectiveSystem)
                      : "Tono"
                    : `${semitones > 0 ? "+" : ""}${semitones}`}
                </button>
                <ToolbarButton
                  onClick={() => setSemitones((s) => (s >= 6 ? -5 : s + 1))}
                  disabled={!showChords}
                  label="Subir un semitono"
                >
                  <span className="text-base font-semibold leading-none">
                    ♪+
                  </span>
                </ToolbarButton>
              </div>
            </div>
          </div>
          <span
            aria-hidden="true"
            className="mx-2 h-6 w-px bg-white/30"
          />
          <ToolbarButton
            onClick={() => adjustLetterScale(-LETTER_SCALE_STEP)}
            disabled={letterScale <= LETTER_SCALE_MIN}
            label="Reducir tamaño de letra"
          >
            <span className="text-base font-semibold leading-none">A−</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => adjustLetterScale(LETTER_SCALE_STEP)}
            disabled={letterScale >= LETTER_SCALE_MAX}
            label="Ampliar tamaño de letra"
          >
            <span className="text-base font-semibold leading-none">A+</span>
          </ToolbarButton>
        </div>

        <SongHamburgerMenu
          songId={songId}
          songSlug={songSlug}
          songTitle={songTitle}
          canEdit={canEdit}
          canPrintWithChords={chordsAvailable}
          semitones={semitones}
          system={system}
          youtubeEmbed={youtubeEmbed}
          hasFiles={hasFiles}
          media={media}
          setMedia={setMedia}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  pressed,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={flashButton}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white text-white transition-colors focus:outline-none enabled:hover:bg-white enabled:hover:text-[color:var(--toolbar-bg,#436bb0)] disabled:opacity-50 ${
        pressed ? "bg-white text-[color:#436bb0]" : ""
      }`}
      style={pressed ? { color: HEADER_BG } : undefined}
    >
      {children}
    </button>
  );
}

const EighthNoteIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* Plicas (tallos verticales) */}
    <line x1="7" y1="18" x2="7" y2="6" />
    <line x1="17" y1="16" x2="17" y2="4" />
    {/* Barra superior que une las dos plicas */}
    <line x1="7" y1="6" x2="17" y2="4" />
    {/* Cabezas (rellenas) */}
    <ellipse
      cx="5"
      cy="18"
      rx="2.5"
      ry="2"
      transform="rotate(-20 5 18)"
      fill="currentColor"
      stroke="none"
    />
    <ellipse
      cx="15"
      cy="16"
      rx="2.5"
      ry="2"
      transform="rotate(-20 15 16)"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

function ChordsCycleButton({
  showChords,
  effectiveSystem,
  originalKey,
  semitones,
  onCycle,
}: {
  showChords: boolean;
  effectiveSystem: "latin" | "english";
  originalKey: string | null;
  semitones: number;
  onCycle: () => void;
}) {
  const on = showChords;
  // Tono de la canción transpuesto al sistema actual. Solo si hay tono
  // original cargado; si no, mostramos solo el ícono de nota.
  const suffix =
    on && originalKey
      ? transposeChord(originalKey, semitones, effectiveSystem)
      : null;
  const label = !on
    ? "Mostrar acordes"
    : effectiveSystem === "latin"
      ? "Acordes en cifrado latino (click → americano)"
      : "Acordes en cifrado americano (click → ocultar)";

  // Color de fondo por estado:
  //  - off            → azul (header)
  //  - on + latino    → amarillo (acento)
  //  - on + americano → blanco
  const bg = !on
    ? HEADER_BG
    : effectiveSystem === "latin"
      ? "var(--color-secondary)"
      : "#ffffff";
  // Texto/ícono legible sobre cada fondo: blanco sobre azul, azul en el resto.
  const fg = !on ? "#ffffff" : HEADER_BG;

  return (
    <button
      type="button"
      onClick={onCycle}
      onPointerDown={flashButton}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={`relative flex h-10 items-center justify-center rounded-full border border-white transition-colors focus:outline-none ${
        suffix ? "w-14" : "w-10"
      }`}
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className={suffix ? "absolute left-2" : ""}>
        <EighthNoteIcon size={18} />
      </span>
      {suffix && (
        <span className="absolute right-2 text-xs font-semibold leading-none">
          {suffix}
        </span>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Hamburger menu                                                             */
/* -------------------------------------------------------------------------- */

const menuIconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const HamburgerIcon = () => (
  <svg {...menuIconProps}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
const HomeIcon = () => (
  <svg {...menuIconProps}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-6h4v6" />
  </svg>
);
const PrinterIcon = () => (
  <svg {...menuIconProps}>
    <path d="M6 9V3h12v6" />
    <rect x="3" y="9" width="18" height="9" rx="2" />
    <path d="M7 18v3h10v-3" />
  </svg>
);
const ScreenIcon = () => (
  <svg {...menuIconProps}>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
const ModoOscuroIcon = () => (
  <svg {...menuIconProps}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  </svg>
);
const ModoClaroIcon = () => (
  <svg {...menuIconProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
  </svg>
);
const EditIcon = () => (
  <svg {...menuIconProps}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);
const DownloadIcon = () => (
  <svg {...menuIconProps}>
    <path d="M12 4v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);
const StopIcon = () => (
  <svg {...menuIconProps}>
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
);
const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg
    {...menuIconProps}
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

function SongHamburgerMenu({
  songId,
  songSlug,
  songTitle,
  canEdit,
  canPrintWithChords,
  semitones,
  system,
  youtubeEmbed,
  hasFiles,
  media,
  setMedia,
}: {
  songId: string;
  songSlug: string;
  songTitle: string;
  canEdit: boolean;
  canPrintWithChords: boolean;
  semitones: number;
  system: ChordSystem;
  youtubeEmbed: string | null;
  hasFiles: boolean;
  media:
    | { type: "youtube" }
    | { type: "audio"; src: string; label: string }
    | null;
  setMedia: (
    m:
      | { type: "youtube" }
      | { type: "audio"; src: string; label: string }
      | null
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [downloadsOpen, setDownloadsOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [scores, setScores] = useState<
    Array<{ id: string; bucket: string; path: string; label: string | null }> | null
  >(null);
  const [audios, setAudios] = useState<
    Array<{ id: string; bucket: string; path: string; label: string | null }> | null
  >(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const {
    active: wakeLockActive,
    supported: wakeLockSupported,
    toggle: toggleWakeLock,
  } = useWakeLock();
  const hasYoutube = Boolean(youtubeEmbed);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || scores !== null) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("song_files")
        .select("id, bucket, path, label")
        .eq("song_id", songId)
        .eq("kind", "score_pdf")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setScores(
        (data ?? []) as Array<{
          id: string;
          bucket: string;
          path: string;
          label: string | null;
        }>
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open, scores, songId]);

  useEffect(() => {
    if (!open || !hasFiles || audios !== null) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("song_files")
        .select("id, bucket, path, label")
        .eq("song_id", songId)
        .in("kind", ["audio_mp3", "audio_ogg"])
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setAudios(
        (data ?? []) as Array<{
          id: string;
          bucket: string;
          path: string;
          label: string | null;
        }>
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [open, audios, songId, hasFiles]);

  const close = () => {
    setOpen(false);
    setDownloadsOpen(false);
    setPrintOpen(false);
  };

  async function pickAudio(file: {
    bucket: string;
    path: string;
    label: string | null;
  }) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 3600);
    if (data?.signedUrl) {
      setMedia({
        type: "audio",
        src: data.signedUrl,
        label: file.label ?? file.path.split("/").pop() ?? file.path,
      });
      close();
    }
  }

  async function downloadScore(file: {
    bucket: string;
    path: string;
    label: string | null;
  }) {
    const supabase = createClient();
    const ext = file.path.includes(".") ? file.path.split(".").pop() : "";
    const base = (file.label ?? songTitle).replace(/[\\/:*?"<>|]/g, "_");
    const filename = ext ? `${base}.${ext}` : base;
    const { data } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 60, { download: filename });
    if (data?.signedUrl) {
      window.location.href = data.signedUrl;
      close();
    }
  }

  function buildPrintHref(withChords: boolean): string {
    const params = new URLSearchParams();
    params.set("chords", withChords ? "1" : "0");
    if (semitones !== 0) params.set("semitones", String(semitones));
    if (system !== "auto") params.set("system", system);
    return `/canciones/${songSlug}/imprimir?${params.toString()}`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onPointerDown={flashButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú"
        title="Menú"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white text-white transition-colors focus:outline-none hover:bg-white hover:text-[color:#436bb0]"
      >
        <HamburgerIcon />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-64 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        >
          <ul className="py-1 text-sm">
              <li>
                <SongMenuItem
                  icon={<HomeIcon />}
                  label="Inicio"
                  bold
                  onSelect={() => {
                    close();
                    router.push("/");
                  }}
                />
              </li>
              {media !== null && (
                <li>
                  <SongMenuItem
                    icon={<StopIcon />}
                    label="Detener reproducción"
                    onSelect={() => {
                      setMedia(null);
                      close();
                    }}
                  />
                </li>
              )}
              {media === null && hasYoutube && (
                <li>
                  <SongMenuItem
                    icon={<YoutubeIcon />}
                    label="Reproducir YouTube"
                    onSelect={() => {
                      setMedia({ type: "youtube" });
                      close();
                    }}
                  />
                </li>
              )}
              {media === null &&
                audios?.map((f) => (
                  <li key={f.id}>
                    <SongMenuItem
                      icon={<SpeakerIcon />}
                      label={`Reproducir ${f.label ?? "audio"}`}
                      onSelect={() => {
                        void pickAudio(f);
                      }}
                    />
                  </li>
                ))}
              {scores && scores.length > 0 && (
                <>
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      aria-expanded={downloadsOpen}
                      onClick={() => setDownloadsOpen((v) => !v)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
                    >
                      <span aria-hidden="true" className="text-muted-foreground">
                        <DownloadIcon />
                      </span>
                      <span className="flex-1">Descargar...</span>
                      <span aria-hidden="true" className="text-muted-foreground">
                        <ChevronDownIcon open={downloadsOpen} />
                      </span>
                    </button>
                  </li>
                  <li
                    aria-hidden={!downloadsOpen}
                    style={{
                      display: "grid",
                      gridTemplateRows: downloadsOpen ? "1fr" : "0fr",
                      transition: "grid-template-rows 300ms ease",
                    }}
                  >
                    <ul style={{ overflow: "hidden" }}>
                      {scores.map((f) => (
                        <li key={f.id}>
                          <button
                            type="button"
                            role="menuitem"
                            tabIndex={downloadsOpen ? 0 : -1}
                            onClick={() => {
                              void downloadScore(f);
                            }}
                            className="flex w-full items-center gap-3 py-2 pl-10 pr-4 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
                          >
                            <span aria-hidden="true" className="text-muted-foreground">
                              <DownloadIcon />
                            </span>
                            {f.label ?? "partitura"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                </>
              )}
              <li>
                <button
                  type="button"
                  role="menuitem"
                  aria-expanded={printOpen}
                  onClick={() => setPrintOpen((v) => !v)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
                >
                  <span aria-hidden="true" className="text-muted-foreground">
                    <PrinterIcon />
                  </span>
                  <span className="flex-1">Imprimir...</span>
                  <span aria-hidden="true" className="text-muted-foreground">
                    <ChevronDownIcon open={printOpen} />
                  </span>
                </button>
              </li>
              <li
                aria-hidden={!printOpen}
                style={{
                  display: "grid",
                  gridTemplateRows: printOpen ? "1fr" : "0fr",
                  transition: "grid-template-rows 300ms ease",
                }}
              >
                <ul style={{ overflow: "hidden" }}>
                  {canPrintWithChords && (
                    <li>
                      <a
                        href={buildPrintHref(true)}
                        role="menuitem"
                        tabIndex={printOpen ? 0 : -1}
                        onClick={close}
                        className="flex w-full items-center gap-3 py-2 pl-10 pr-4 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
                      >
                        <span aria-hidden="true" className="text-muted-foreground">
                          <PrinterIcon />
                        </span>
                        con acordes <em>#</em>
                      </a>
                    </li>
                  )}
                  <li>
                    <a
                      href={buildPrintHref(false)}
                      role="menuitem"
                      tabIndex={printOpen ? 0 : -1}
                      onClick={close}
                      className="flex w-full items-center gap-3 py-2 pl-10 pr-4 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
                    >
                      <span aria-hidden="true" className="text-muted-foreground">
                        <PrinterIcon />
                      </span>
                      sin acordes
                    </a>
                  </li>
                </ul>
              </li>
              {wakeLockSupported !== false && (
                <li>
                  <SongMenuToggle
                    icon={<ScreenIcon />}
                    label="No apagar pantalla"
                    checked={wakeLockActive}
                    disabled={wakeLockSupported === null}
                    onChange={() => toggleWakeLock()}
                  />
                </li>
              )}
              <li>
                <SongMenuItem
                  icon={theme === "dark" ? <ModoClaroIcon /> : <ModoOscuroIcon />}
                  label={theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
                  onSelect={() => {
                    toggleTheme();
                    close();
                  }}
                />
              </li>
              <li>
                <SongMenuItem
                  icon={<ShareIcon />}
                  label="Compartir..."
                  onSelect={() => {
                    close();
                    setQrOpen(true);
                  }}
                />
              </li>
              {canEdit && (
                <>
                  <li
                    role="separator"
                    aria-hidden="true"
                    className="my-1 border-t border-border"
                  />
                  <li>
                    <Link
                      href={`/admin/canciones/${songId}/editar`}
                      role="menuitem"
                      onClick={close}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
                    >
                      <span aria-hidden="true" className="text-muted-foreground">
                        <EditIcon />
                      </span>
                      Editar
                    </Link>
                  </li>
                </>
              )}
            </ul>
        </div>
      )}
      <QrDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}

function SongMenuItem({
  icon,
  label,
  onSelect,
  bold = false,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
  bold?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar${
        bold ? " font-bold" : ""
      }`}
    >
      <span aria-hidden="true" className="text-muted-foreground">
        {icon}
      </span>
      {label}
    </button>
  );
}

function SongMenuToggle({
  icon,
  label,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`flex w-full items-center gap-3 px-4 py-2 text-left normal-case transition-colors ${
        disabled
          ? "text-muted-foreground cursor-not-allowed"
          : "text-foreground hover:bg-sidebar"
      }`}
    >
      <span aria-hidden="true" className="text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Auto-scroll panel (siempre visible)                                        */
/* -------------------------------------------------------------------------- */

function AutoScrollPanel({
  on,
  toggle,
  speed,
  setSpeed,
}: {
  on: boolean;
  toggle: () => void;
  speed: number;
  setSpeed: (n: number) => void;
}) {
  const canUp = speed < 7;
  const canDown = speed > 1;
  return (
    <div
      role="group"
      aria-label="Desplazamiento automático"
      className="fixed bottom-[104px] right-4 z-30"
      style={{ width: 40, height: 40 }}
    >
      <button
        type="button"
        onClick={() => canUp && setSpeed(speed + 1)}
        disabled={!canUp || !on}
        tabIndex={on ? 0 : -1}
        aria-hidden={!on}
        aria-label={`Aumentar velocidad (actual ${speed})`}
        title={`Aumentar velocidad (actual ${speed})`}
        onPointerDown={flashButton}
        className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg focus:outline-none enabled:hover:opacity-90 disabled:opacity-40"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          backgroundColor: "#436bb0",
          transform: on ? "translateY(-48px)" : "translateY(0)",
          opacity: on ? 1 : 0,
          pointerEvents: on ? "auto" : "none",
          transition: "transform 350ms ease, opacity 350ms ease",
        }}
      >
        <span className="text-lg font-semibold leading-none">+</span>
      </button>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={
          on
            ? `Detener desplazamiento automático (velocidad ${speed})`
            : `Iniciar desplazamiento automático (velocidad ${speed})`
        }
        title={
          on
            ? `Detener desplazamiento automático (velocidad ${speed})`
            : `Iniciar desplazamiento automático (velocidad ${speed})`
        }
        onPointerDown={flashButton}
        className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-colors focus:outline-none hover:opacity-90"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          zIndex: 10,
          backgroundColor: on ? "#1f3f73" : "#436bb0",
        }}
      >
        <svg
          width="22"
          height="22"
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
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: 13,
            transform: "translateX(-50%)",
          }}
          className="text-[10px] font-bold leading-none"
        >
          {speed}
        </span>
      </button>
      <button
        type="button"
        onClick={() => canDown && setSpeed(speed - 1)}
        disabled={!canDown || !on}
        tabIndex={on ? 0 : -1}
        aria-hidden={!on}
        aria-label={`Reducir velocidad (actual ${speed})`}
        title={`Reducir velocidad (actual ${speed})`}
        onPointerDown={flashButton}
        className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg focus:outline-none enabled:hover:opacity-90 disabled:opacity-40"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          backgroundColor: "#436bb0",
          transform: on ? "translateY(48px)" : "translateY(0)",
          opacity: on ? 1 : 0,
          pointerEvents: on ? "auto" : "none",
          transition: "transform 350ms ease, opacity 350ms ease",
        }}
      >
        <span className="text-lg font-semibold leading-none">−</span>
      </button>
    </div>
  );
}

