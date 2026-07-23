"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PlayIcon } from "@/app/components/icons";
import { getPublicImageUrl } from "@/lib/supabase/storage";
import type { SalmoRow } from "@/lib/salmos-admin";

export function SalmosList({ salmos }: { salmos: SalmoRow[] }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const filtered = term
    ? salmos.filter(
        (s) => String(s.psalm_number) === term || s.response.toLowerCase().includes(term)
      )
    : salmos;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nº de salmo o antífona…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm normal-case"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Borrar búsqueda"
            title="Borrar"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-xs normal-case text-muted-foreground">{filtered.length} salmos</p>

      <ul className="flex flex-col gap-2">
        {filtered.map((s) => (
          <li key={s.id}>
            <SalmoRowItem salmo={s} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SalmoRowItem({ salmo }: { salmo: SalmoRow }) {
  return (
    <Link
      href={`/admin/salmos/${salmo.id}`}
      className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
    >
      {/* Línea 1: referencia (izq) + iconos audio/partitura (der). */}
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm uppercase tracking-wide text-secondary">
          {salmo.ref?.trim() || `Sal ${salmo.psalm_number}`}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-primary">
          {salmo.audios.length > 0 && (
            <PlayAudioButton url={getPublicImageUrl(salmo.audios[0].path)} />
          )}
          {salmo.scores.length > 0 && <MiniIcon kind="score" />}
        </span>
      </div>
      {/* Línea 2: antífona (izq) + chevron (der). */}
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-sm text-foreground normal-case">
          {salmo.response}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-muted-foreground"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}

// Botón play/pausa dentro de la tarjeta (que es un <Link>): reproduce el primer
// audio del salmo sin navegar. Detiene los demás audios al empezar.
function PlayAudioButton({ url }: { url: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  if (!url) return null;
  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        aria-label={playing ? "Pausar" : "Escuchar"}
        title={playing ? "Pausar" : "Escuchar"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const el = audioRef.current;
          if (!el) return;
          if (playing) el.pause();
          else void el.play();
        }}
        className="text-primary transition-opacity hover:opacity-70"
      >
        {playing ? <PauseCircleIcon /> : <PlayIcon />}
      </button>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onPlay={(e) => {
          document.querySelectorAll("audio").forEach((a) => a !== e.currentTarget && a.pause());
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </span>
  );
}

// Pausa "en círculo", al tono del PlayIcon del design system (icons.tsx).
function PauseCircleIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <rect x="9" y="8.5" width="2" height="7" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="13" y="8.5" width="2" height="7" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MiniIcon({ kind }: { kind: "audio" | "score" }) {
  if (kind === "audio") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Tiene audio"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      </svg>
    );
  }
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Tiene partitura"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}
