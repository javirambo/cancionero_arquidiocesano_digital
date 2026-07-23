"use client";

import { useRef, useState } from "react";

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Control compacto inline: play/pausa + "Escuchar canto" + línea de tiempo.
export function SalmoAudioButton({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
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
    <div className="flex w-full max-w-md items-center gap-2 text-primary">
      <span className="shrink-0 text-xs font-semibold normal-case">Escuchar canto</span>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar" : "Escuchar canto"}
        title={playing ? "Pausar" : "Escuchar canto"}
        className="shrink-0 hover:opacity-70"
      >
        {playing ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
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
      <audio
        ref={ref}
        src={url}
        preload="metadata"
        onPlay={(e) => {
          document.querySelectorAll("audio").forEach((a) => a !== e.currentTarget && a.pause());
          setPlaying(true);
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
    </div>
  );
}
