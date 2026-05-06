import type { ChordLine } from "@/lib/chordpro";

export type LineBlock = { inChorus: boolean; lines: ChordLine[] };

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
    return <div>{line.lyrics || " "}</div>;
  }

  const segments: { chord: string | null; text: string }[] = [];
  const sortedChords = [...line.chords].sort((a, b) => a.index - b.index);
  let cursor = 0;
  if (sortedChords.length > 0 && sortedChords[0].index > 0) {
    segments.push({
      chord: null,
      text: line.lyrics.slice(0, sortedChords[0].index),
    });
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
            {seg.chord ?? " "}
          </span>
          <span className="whitespace-pre">{seg.text || " "}</span>
        </span>
      ))}
    </div>
  );
}
