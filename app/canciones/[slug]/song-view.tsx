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
import { usePreferences } from "@/app/components/preferences";
import { useFavorites } from "@/app/components/favorites";
import { YoutubeIcon } from "@/app/components/icons";
import { DownloadFilesMenu } from "@/app/components/download-files-menu";
import {
  useLetterScale,
  LETTER_SCALE_MIN,
  LETTER_SCALE_MAX,
  LETTER_SCALE_STEP,
} from "@/app/components/letter-scale";

type Props = {
  songId: string;
  songTitle: string;
  body: string;
  originalKey: string | null;
  youtubeEmbed: string | null;
  hasFiles: boolean;
};

const STORAGE_KEY_PREFIX = "song:transpose:";

export function SongView({
  songId,
  songTitle,
  body,
  originalKey,
  youtubeEmbed,
  hasFiles,
}: Props) {
  const lines = useMemo(() => parseBody(body), [body]);
  const chordsExist = useMemo(() => hasAnyChord(body), [body]);
  const { suggestChords } = usePreferences();
  const { isAuthenticated } = useFavorites();
  // CU-03: los acordes y la transposición sólo se exponen a usuarios con
  // sesión que además activaron "Sugerir acordes" en su perfil.
  const chordsAvailable = chordsExist && suggestChords && isAuthenticated;

  const [showChords, setShowChords] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [semitones, setSemitones] = useState(0);
  const { scale: letterScale, adjust: adjustLetterScale } = useLetterScale();
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
        className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border bg-sidebar px-2 py-3 sm:gap-3 sm:px-4"
      >
        {chordsAvailable && (
          <>
        <button
          type="button"
          onClick={() => setShowChords((v) => !v)}
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
        >
          <button
            type="button"
            onClick={() => setSemitones((s) => s - 1)}
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
            onClick={() => setSemitones((s) => s + 1)}
            disabled={!showChords}
            aria-label="Subir un semitono"
            title="Subir un semitono"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors enabled:hover:bg-primary enabled:hover:text-white disabled:border-border disabled:text-muted-foreground disabled:opacity-50"
          >
            <span className="text-base font-semibold leading-none">♪+</span>
          </button>
        </div>
          </>
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
          {youtubeEmbed && (
            <button
              type="button"
              onClick={() => setShowVideo((v) => !v)}
              aria-pressed={showVideo}
              aria-label={showVideo ? "Ocultar video" : "Reproducir"}
              title={showVideo ? "Ocultar video" : "Reproducir"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-white [&_svg]:h-6 [&_svg]:w-6"
            >
              <YoutubeIcon />
            </button>
          )}
          {hasFiles && (
            <DownloadFilesMenu songId={songId} songTitle={songTitle} />
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

      <div
        className="font-serif text-base leading-8 normal-case text-foreground"
        style={{ fontSize: `${letterScale}rem` }}
      >
        {groupChorus(transposed).map((block, i) =>
          block.inChorus ? (
            <div
              key={i}
              className="my-2 border-l-4 border-primary pl-4 italic"
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
    </div>
  );
}

type LineBlock = { inChorus: boolean; lines: ChordLine[] };

function groupChorus(lines: ChordLine[]): LineBlock[] {
  const blocks: LineBlock[] = [];
  for (const line of lines) {
    const inChorus = line.inChorus === true;
    const last = blocks[blocks.length - 1];
    if (last && last.inChorus === inChorus) {
      last.lines.push(line);
    } else {
      blocks.push({ inChorus, lines: [line] });
    }
  }
  return blocks;
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
          <span className="-mb-0.5 text-[0.875em] font-bold leading-none text-primary">
            {seg.chord ?? " "}
          </span>
          <span className="whitespace-pre">{seg.text || " "}</span>
        </span>
      ))}
    </div>
  );
}
