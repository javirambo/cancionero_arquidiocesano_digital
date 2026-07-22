"use client";

// Controles de media reusables (audio del salmo + partitura). Los usan el CRUD
// de salmos (app/(app)/admin/salmos) y el editor de lecturas para mostrar la
// media del salmo linkeado. Reciben la URL ya resuelta.

import { useRef, useState } from "react";

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Reproduce el audio inline. Al darle play el ícono pasa a pausa y aparece una
// barra de progreso para mover el punto de reproducción.
export function AudioButton({ url, label }: { url: string | null; label: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
  }
  function seek(v: number) {
    const el = ref.current;
    if (!el) return;
    el.currentTime = v;
    setCurrent(v);
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {started ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="any"
            value={current}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Progreso del audio"
            className="h-1 min-w-0 flex-1 cursor-pointer accent-primary"
          />
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {formatTime(current)} / {formatTime(duration)}
          </span>
        </div>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-foreground normal-case">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar" : "Escuchar"}
        title={playing ? "Pausar" : "Escuchar"}
        className="shrink-0 text-primary hover:opacity-70"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      {url && (
        <audio
          ref={ref}
          src={url}
          preload="none"
          onPlay={(e) => {
            document.querySelectorAll("audio").forEach((a) => a !== e.currentTarget && a.pause());
            setPlaying(true);
            setStarted(true);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrent(0);
            if (ref.current) ref.current.currentTime = 0;
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />
      )}
    </div>
  );
}

// Muestra la imagen en un popup con el fondo blureado; un click afuera cierra.
export function ImagePreviewButton({ url }: { url: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver"
        title="Ver"
        className="shrink-0 text-primary hover:opacity-70"
      >
        <EyeIcon />
      </button>
      {open && url && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Partitura"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

export function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
