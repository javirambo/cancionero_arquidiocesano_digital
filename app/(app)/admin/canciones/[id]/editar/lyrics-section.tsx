"use client";

import { useMemo, useRef, useState } from "react";
import { detectSystem, parseBody, type ChordLine } from "@/lib/chordpro";
import type { SongFormState } from "./song-form";
import { Accordion } from "./accordion";
import { ChordEditor, type ChordEditorHandle } from "./chord-editor";
import {
  ChordsIcon,
  EditIcon,
  EyeIcon,
  HelpIcon,
  RepeatIcon,
} from "@/app/components/icons";

export function LyricsSection({
  form,
  update,
}: {
  form: SongFormState;
  update: <K extends keyof SongFormState>(key: K, value: SongFormState[K]) => void;
}) {
  const [preview, setPreview] = useState(false);
  const lines = useMemo(() => parseBody(form.body), [form.body]);
  const editorRef = useRef<ChordEditorHandle>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const detected = useMemo(() => detectSystem(lines), [lines]);

  function insertChord(chord: string) {
    setPickerOpen(false);
    editorRef.current?.insertText(`[${chord}]`);
  }

  function insertChorus() {
    editorRef.current?.wrapSelectionAsBlock(
      "{start_of_chorus}",
      "{end_of_chorus}"
    );
  }

  return (
    <Accordion title="Letra y acordes" defaultOpen>
      <div className="flex flex-col gap-3 normal-case">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setHelpOpen((v) => !v)}
              aria-expanded={helpOpen}
              aria-label="Ayuda sobre notación ChordPro"
              title="Ayuda sobre notación ChordPro"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <HelpIcon />
            </button>
            {helpOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setHelpOpen(false)}
                  aria-hidden
                />
                <div
                  role="dialog"
                  className="fixed left-1/2 top-1/2 z-30 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-3 text-xs leading-5 shadow-lg sm:absolute sm:left-0 sm:top-full sm:mt-2 sm:translate-x-0 sm:translate-y-0"
                >
                  <p className="mb-1 font-semibold text-foreground">
                    Notación ChordPro:
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    <li>
                      Los acordes van entre corchetes sobre la sílaba.
                      Ejemplo:{" "}
                      <code className="rounded bg-sidebar px-1">
                        [G]Cris[D]to vi[Em]ve
                      </code>
                    </li>
                    <li>
                      El estribillo va entre{" "}
                      <code className="rounded bg-sidebar px-1">{"{soc}"}</code>{" "}
                      ...{" "}
                      <code className="rounded bg-sidebar px-1">{"{eoc}"}</code>{" "}
                      o{" "}
                      <code className="rounded bg-sidebar px-1">
                        {"{start_of_chorus}"}
                      </code>{" "}
                      ...{" "}
                      <code className="rounded bg-sidebar px-1">
                        {"{end_of_chorus}"}
                      </code>
                    </li>
                  </ul>
                  <p className="mt-2 text-muted-foreground">Ejemplo:</p>
                  <pre className="mt-1 overflow-x-auto rounded bg-sidebar p-2 font-mono text-foreground">
{`{start_of_chorus}
Abba Padre, venga tu Reino
{end_of_chorus}`}
                  </pre>
                </div>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!preview && (
              <>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPickerOpen((v) => !v)}
                    aria-expanded={pickerOpen}
                    aria-label="Insertar acorde"
                    title="Insertar acorde"
                    className="flex items-center gap-2 rounded-full border border-primary px-3 py-1.5 text-sm uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:px-4"
                  >
                    <ChordsIcon />
                    <span className="hidden sm:inline">Insertar acorde</span>
                  </button>
                  {pickerOpen && (
                    <ChordPicker
                      system={detected}
                      onPick={insertChord}
                      onClose={() => setPickerOpen(false)}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={insertChorus}
                  aria-label="Marcar como estribillo"
                  title="Marcar la selección (o insertar) como estribillo"
                  className="flex items-center gap-2 rounded-full border border-primary px-3 py-1.5 text-sm uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-primary-foreground sm:px-4"
                >
                  <RepeatIcon />
                  <span className="hidden sm:inline">Estribillo</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              aria-pressed={preview}
              aria-label={preview ? "Editar" : "Previsualizar"}
              title={preview ? "Editar" : "Previsualizar"}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm uppercase tracking-wide transition-colors sm:px-4 ${
                preview
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              {preview ? <EditIcon /> : <EyeIcon />}
              <span className="hidden sm:inline">
                {preview ? "Editar" : "Previsualizar"}
              </span>
            </button>
          </div>
        </div>

        {preview ? (
          <div className="min-h-[20rem] rounded-lg border border-border bg-background px-4 py-3 font-serif text-base leading-8 text-foreground">
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                (Todavía no hay letra cargada.)
              </p>
            ) : (
              groupChorus(lines).map((block, i) =>
                block.inChorus ? (
                  <div
                    key={i}
                    className="my-2 border-l-[3px] border-primary pl-2 font-bold"
                  >
                    {block.lines.map((line, j) => (
                      <LineView key={j} line={line} />
                    ))}
                  </div>
                ) : (
                  <div key={i}>
                    {block.lines.map((line, j) => (
                      <LineView key={j} line={line} />
                    ))}
                  </div>
                )
              )
            )}
          </div>
        ) : (
          <ChordEditor
            ref={editorRef}
            value={form.body}
            onChange={(v) => update("body", v)}
          />
        )}
      </div>
    </Accordion>
  );
}

const NOTES_LATIN = [
  "Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si",
];
const NOTES_ENGLISH = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

type Quality = "" | "m" | "7" | "m7" | "maj7" | "sus4";
const QUALITIES: { value: Quality; label: string }[] = [
  { value: "", label: "Mayor" },
  { value: "m", label: "menor (m)" },
  { value: "7", label: "7" },
  { value: "m7", label: "m7" },
  { value: "maj7", label: "maj7" },
  { value: "sus4", label: "sus4" },
];

function ChordPicker({
  system,
  onPick,
  onClose,
}: {
  system: "latin" | "english";
  onPick: (chord: string) => void;
  onClose: () => void;
}) {
  const [sys, setSys] = useState<"latin" | "english">(system);
  const [quality, setQuality] = useState<Quality>("");
  const notes = sys === "latin" ? NOTES_LATIN : NOTES_ENGLISH;

  return (
    <>
      <div
        className="fixed inset-0 z-20"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed left-1/2 top-1/2 z-30 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-3 shadow-lg normal-case sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:translate-x-0 sm:translate-y-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-[0.15em] text-secondary">
            Insertar acorde
          </span>
          <button
            type="button"
            onClick={() =>
              setSys((s) => (s === "latin" ? "english" : "latin"))
            }
            className="text-xs uppercase tracking-wide text-primary hover:underline"
          >
            {sys === "latin" ? "Do · Re · Mi" : "C · D · E"}
          </button>
        </div>

        <label className="mb-2 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Sufijo</span>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as Quality)}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          >
            {QUALITIES.map((q) => (
              <option key={q.value} value={q.value}>
                {q.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-4 gap-1.5">
          {notes.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPick(n + quality)}
              className="rounded-md border border-border px-2 py-1.5 font-mono text-sm text-foreground hover:border-primary hover:text-primary"
            >
              {n}
              {quality}
            </button>
          ))}
        </div>
      </div>
    </>
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

function LineView({ line }: { line: ChordLine }) {
  if (line.lyrics === "" && line.chords.length === 0) {
    return <div className="h-4" />;
  }
  if (line.chords.length === 0) {
    return <div>{line.lyrics || " "}</div>;
  }

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
            {seg.chord ?? " "}
          </span>
          <span className="whitespace-pre">{seg.text || " "}</span>
        </span>
      ))}
    </div>
  );
}
