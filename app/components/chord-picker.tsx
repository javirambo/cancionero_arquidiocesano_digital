"use client";

import { useState } from "react";

const NOTES_LATIN = [
  "Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si",
];
const NOTES_ENGLISH = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
];

type Quality = "" | "m" | "7" | "m7" | "maj7" | "sus4";
const QUALITIES: { value: Quality; label: string }[] = [
  { value: "", label: "Mayor" },
  { value: "m", label: "menor" },
  { value: "7", label: "7" },
  { value: "m7", label: "m7" },
  { value: "maj7", label: "maj7" },
  { value: "sus4", label: "sus4" },
];

export function ChordPicker({
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
  const noteTextSize = quality.length >= 4 ? "text-xs" : "text-sm";

  return (
    <>
      <div
        className="fixed inset-0 z-20 bg-black/40"
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
            className="rounded-full border border-secondary bg-card px-3 py-1 text-xs uppercase tracking-wide text-secondary transition-colors hover:bg-secondary hover:text-primary-foreground"
          >
            {sys === "latin" ? "Do · Re · Mi" : "C · D · E"}
          </button>
        </div>

        <div className="mb-2 flex w-full items-center gap-[0.3rem]">
          {QUALITIES.map((q) => {
            const active = quality === q.value;
            return (
              <button
                key={q.value}
                type="button"
                onClick={() => setQuality(q.value)}
                aria-pressed={active}
                className={`flex-1 whitespace-nowrap rounded-full border px-1 py-1 text-center text-xs transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {q.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {notes.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onPick(n + quality)}
              className={`flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-border px-2 font-mono ${noteTextSize} text-foreground hover:border-primary hover:text-primary`}
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
