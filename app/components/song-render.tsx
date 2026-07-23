import type { ReactNode } from "react";
import { parseLine, RESPONSE_TEXT, type ChordLine } from "@/lib/chordpro";

export type LineBlock = { inChorus: boolean; lines: ChordLine[] };

/**
 * Renderiza un tramo de letra resaltando las respuestas del salmo ("R.").
 *
 * `offset` es la posición del tramo dentro de `line.lyrics`, porque cuando
 * hay acordes la línea se parte en segmentos y cada uno recibe solo su
 * pedazo. Un acorde solo puede caer justo antes o justo después de la "R."
 * (nunca en el medio, ver `parseLine`), así que una respuesta siempre entra
 * entera en un segmento y no hace falta partirla entre dos.
 */
export function LyricsText({
  text,
  offset = 0,
  responses,
}: {
  text: string;
  offset?: number;
  responses?: number[];
}) {
  const hits = (responses ?? []).filter(
    (r) => r >= offset && r + RESPONSE_TEXT.length <= offset + text.length
  );
  if (hits.length === 0) return <>{text}</>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const abs of hits) {
    const start = abs - offset;
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <strong key={abs} className="font-bold text-response">
        {text.slice(start, start + RESPONSE_TEXT.length)}
      </strong>
    );
    cursor = start + RESPONSE_TEXT.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

export function groupChorus(lines: ChordLine[]): LineBlock[] {
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

export function LineView({
  line,
  showChords,
}: {
  line: ChordLine;
  showChords: boolean;
}) {
  if (line.lyrics === "" && line.chords.length === 0) {
    return <div className="h-4" />;
  }

  if (!showChords || line.chords.length === 0) {
    return (
      <div>
        {line.lyrics === "" ? (
          " "
        ) : (
          <LyricsText text={line.lyrics} responses={line.responses} />
        )}
      </div>
    );
  }

  const segments: { chord: string | null; text: string; offset: number }[] = [];
  const sortedChords = [...line.chords].sort((a, b) => a.index - b.index);
  let cursor = 0;
  if (sortedChords.length > 0 && sortedChords[0].index > 0) {
    segments.push({
      chord: null,
      text: line.lyrics.slice(0, sortedChords[0].index),
      offset: 0,
    });
    cursor = sortedChords[0].index;
  }
  for (let i = 0; i < sortedChords.length; i++) {
    const here = sortedChords[i];
    const nextIdx = sortedChords[i + 1]?.index ?? line.lyrics.length;
    const text = line.lyrics.slice(here.index, nextIdx);
    segments.push({ chord: here.chord, text, offset: here.index });
    cursor = nextIdx;
  }
  if (cursor < line.lyrics.length) {
    segments.push({
      chord: null,
      text: line.lyrics.slice(cursor),
      offset: cursor,
    });
  }

  return (
    <div className="mt-5 flex flex-wrap items-end leading-tight">
      {segments.map((seg, i) => (
        <span key={i} className="inline-flex min-w-0 flex-col">
          <span className="-mb-0.5 text-[0.875em] font-bold leading-none text-primary">
            {seg.chord ?? " "}
          </span>
          <span className="whitespace-pre-wrap break-words">
            {seg.text === "" ? (
              " "
            ) : (
              <LyricsText
                text={seg.text}
                offset={seg.offset}
                responses={line.responses}
              />
            )}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Renderiza la antífona (respuesta) del salmo. Si el texto trae acordes
 * ChordPro ("[Do]"), los muestra sobre la sílaba (reusa `LineView`); si no,
 * se ve como texto plano. La "R." roja va como marcador aparte (no está en el
 * texto guardado). `prefix` sirve para el rótulo "O bien:" de las alternativas.
 */
export function AntifonaResponse({
  response,
  prefix,
  className,
  showMarker = true,
}: {
  response: string | null | undefined;
  prefix?: ReactNode;
  className?: string;
  showMarker?: boolean;
}) {
  const text = response ?? "";
  const line = parseLine(text);
  const base = `leading-snug normal-case text-foreground${
    className ? ` ${className}` : ""
  }`;

  if (line.chords.length === 0) {
    return (
      <p className={base}>
        {prefix}
        {prefix ? " " : null}
        {showMarker && <span className="text-response">R.</span>}
        {showMarker ? " " : null}
        {text}
      </p>
    );
  }

  return (
    <div className={`flex flex-wrap items-end gap-x-1.5 ${base}`}>
      {prefix}
      {showMarker && <span className="text-response">R.</span>}
      <LineView line={line} showChords />
    </div>
  );
}

/**
 * Recuadro de vista previa de la antífona: fondo crema, compacto, centrado y
 * sin el marcador "R.". Se usa en el alta/edición de salmos y en el "Salmo
 * usado" de lecturas. Reusa `AntifonaResponse` como único render de acordes
 * (el `[&>div]:mt-0` anula el margen de línea que `LineView` usa en canciones).
 */
export function AntifonaPreview({
  response,
  className,
}: {
  response: string | null | undefined;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center rounded-lg border border-border bg-[var(--antifona-preview)] px-3 py-1${
        className ? ` ${className}` : ""
      }`}
    >
      <AntifonaResponse
        response={response}
        showMarker={false}
        className="[&>div]:mt-0"
      />
    </div>
  );
}
