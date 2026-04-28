"use client";

import { useEffect, useMemo, useState } from "react";
import {
  detectSystem,
  hasAnyChord,
  parseBody,
  transposeLine,
  type ChordLine,
  type ChordSystem,
} from "@/lib/chordpro";
import { WakeLockToggle } from "@/app/components/wake-lock-toggle";
import { usePreferences } from "@/app/components/preferences";

type Props = {
  songId: string;
  body: string;
  originalKey: string | null;
  youtubeEmbed: string | null;
};

const STORAGE_KEY_PREFIX = "song:transpose:";

export function SongView({ songId, body, originalKey, youtubeEmbed }: Props) {
  const lines = useMemo(() => parseBody(body), [body]);
  const chordsExist = useMemo(() => hasAnyChord(body), [body]);
  const { suggestChords } = usePreferences();
  // El usuario debe activar "Sugerir acordes" en su perfil para ver acordes.
  const chordsAvailable = chordsExist && suggestChords;

  const [showChords, setShowChords] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [semitones, setSemitones] = useState(0);
  const detected = useMemo<"latin" | "english">(
    () => detectSystem(lines),
    [lines]
  );
  const [system, setSystem] = useState<ChordSystem>("auto");
  // Sistema efectivo: "auto" usa el detectado.
  const effectiveSystem: "latin" | "english" =
    system === "auto" ? detected : (system as "latin" | "english");

  // Restaurar tono persistido (anónimo: localStorage por canción).
  useEffect(() => {
    if (!chordsExist) return;
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + songId);
    if (raw !== null) {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n)) setSemitones(n);
    }
  }, [songId, chordsExist]);

  useEffect(() => {
    if (!chordsExist) return;
    window.localStorage.setItem(STORAGE_KEY_PREFIX + songId, String(semitones));
  }, [songId, semitones, chordsExist]);

  const transposed: ChordLine[] = useMemo(
    () => lines.map((l) => transposeLine(l, semitones, system)),
    [lines, semitones, system]
  );

  const chordsDisabled = !chordsAvailable;

  return (
    <div className="flex flex-col gap-6">
      <div
        role="toolbar"
        aria-label="Controles de la canción"
        className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-sidebar px-4 py-3"
      >
        {chordsAvailable && (
          <>
        <button
          type="button"
          onClick={() => setShowChords((v) => !v)}
          aria-pressed={showChords}
          className="rounded-full border border-primary px-4 py-1.5 text-sm uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white"
        >
          {showChords ? "Ocultar acordes" : "Mostrar acordes"}
        </button>

        <button
          type="button"
          onClick={() =>
            setSystem(effectiveSystem === "latin" ? "english" : "latin")
          }
          title={
            effectiveSystem === "latin"
              ? "Cambiar a cifrado americano (C, D, E…)"
              : "Cambiar a cifrado latino (Do, Re, Mi…)"
          }
          aria-label="Cambiar sistema de cifrado"
          className="rounded-full border border-primary px-4 py-1.5 text-sm uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white"
        >
          {effectiveSystem === "latin" ? "Do · Re · Mi" : "C · D · E"}
        </button>

        <div
          className="flex items-center gap-2"
          aria-label="Transposición"
        >
          <button
            type="button"
            onClick={() => setSemitones((s) => s - 1)}
            aria-label="Bajar un semitono"
            className="h-8 w-8 rounded-full border border-border text-foreground transition-colors hover:border-primary"
          >
            −
          </button>
          <span className="min-w-16 text-center text-sm normal-case text-muted-foreground">
            {originalKey ? `Tono: ${originalKey}` : "Tono"}
            {semitones !== 0 && (
              <span className="ml-1 text-primary">
                ({semitones > 0 ? `+${semitones}` : semitones})
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setSemitones((s) => s + 1)}
            aria-label="Subir un semitono"
            className="h-8 w-8 rounded-full border border-border text-foreground transition-colors hover:border-primary"
          >
            +
          </button>
          {semitones !== 0 && (
            <button
              type="button"
              onClick={() => setSemitones(0)}
              className="text-xs uppercase tracking-wide text-muted-foreground hover:text-primary"
            >
              Restablecer
            </button>
          )}
        </div>
          </>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <WakeLockToggle />
          {youtubeEmbed && (
            <button
              type="button"
              onClick={() => setShowVideo((v) => !v)}
              aria-pressed={showVideo}
              className="rounded-full border border-primary px-4 py-1.5 text-sm uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white"
            >
              {showVideo ? "Ocultar video" : "Reproducir"}
            </button>
          )}
        </div>
      </div>

      {showVideo && youtubeEmbed && (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
          <iframe
            src={youtubeEmbed}
            title="Reproductor de YouTube"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      )}

      <div className="font-serif text-base leading-8 normal-case text-foreground">
        {transposed.map((line, i) => (
          <LineView
            key={i}
            line={line}
            showChords={showChords && !chordsDisabled}
          />
        ))}
      </div>
    </div>
  );
}

function LineView({ line, showChords }: { line: ChordLine; showChords: boolean }) {
  if (line.lyrics === "" && line.chords.length === 0) {
    return <div className="h-4" />;
  }

  if (!showChords || line.chords.length === 0) {
    return <div>{line.lyrics || " "}</div>;
  }

  // Render con acordes alineados sobre las sílabas: cortamos la letra en
  // los índices donde caen los acordes y producimos columnas con el
  // acorde arriba y el fragmento de letra debajo.
  const segments: { chord: string | null; text: string }[] = [];
  const sortedChords = [...line.chords].sort((a, b) => a.index - b.index);
  let cursor = 0;
  if (sortedChords.length > 0 && sortedChords[0].index > 0) {
    segments.push({ chord: null, text: line.lyrics.slice(0, sortedChords[0].index) });
    cursor = sortedChords[0].index;
  }
  for (let i = 0; i < sortedChords.length; i++) {
    const here = sortedChords[i];
    const nextIdx = sortedChords[i + 1]?.index ?? line.lyrics.length;
    const text = line.lyrics.slice(here.index, nextIdx);
    segments.push({ chord: here.chord, text });
    cursor = nextIdx;
  }
  if (cursor < line.lyrics.length) {
    segments.push({ chord: null, text: line.lyrics.slice(cursor) });
  }

  return (
    <div className="mt-5 flex flex-wrap items-end leading-tight">
      {segments.map((seg, i) => (
        <span key={i} className="inline-flex flex-col">
          <span className="-mb-0.5 text-sm font-bold leading-none text-primary">
            {seg.chord ?? " "}
          </span>
          <span className="whitespace-pre">{seg.text || " "}</span>
        </span>
      ))}
    </div>
  );
}
