// ChordPro mínimo: solo extraemos acordes en línea con el formato [Acorde]
// y los exponemos como tokens posicionados sobre la letra.
// Soporta cifrado latino (Do, Re, Mi…) e inglés (C, D, E…), con sufijos
// como m, m7, 7, maj7, sus, dim, aug, /Bajo.

export type ChordToken = { chord: string; index: number };
export type ChordLine = { lyrics: string; chords: ChordToken[] };

const CHORD_RE = /\[([^\]]+)\]/g;

export function parseLine(line: string): ChordLine {
  const chords: ChordToken[] = [];
  let lyrics = "";
  let lastEnd = 0;
  for (const match of line.matchAll(CHORD_RE)) {
    const matchStart = match.index ?? 0;
    lyrics += line.slice(lastEnd, matchStart);
    chords.push({ chord: match[1], index: lyrics.length });
    lastEnd = matchStart + match[0].length;
  }
  lyrics += line.slice(lastEnd);
  return { lyrics, chords };
}

export function parseBody(body: string): ChordLine[] {
  return body.split(/\r?\n/).map(parseLine);
}

export function hasAnyChord(body: string): boolean {
  CHORD_RE.lastIndex = 0;
  return CHORD_RE.test(body);
}

// ---------- Transposición ----------

// Notas en orden cromático (índice 0..11). Aceptamos sostenidos y bemoles
// tanto en notación inglesa como latina.
const NOTE_INDEX: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
  // latino
  Do: 0, "Do#": 1, Reb: 1, Re: 2, "Re#": 3, Mib: 3, Mi: 4, Fa: 5,
  "Fa#": 6, Solb: 6, Sol: 7, "Sol#": 8, Lab: 8, La: 9, "La#": 10, Sib: 10, Si: 11,
};

const SHARP_NAMES_EN = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const SHARP_NAMES_ES = ["Do","Do#","Re","Re#","Mi","Fa","Fa#","Sol","Sol#","La","La#","Si"];

// Detecta si una nota está escrita en notación latina.
function isLatin(note: string): boolean {
  return /^(Do|Re|Mi|Fa|Sol|La|Si)/.test(note);
}

// Parsea un acorde tipo "Lam7/Sol" -> { root: "La", quality: "m7", bass: "Sol" }
function splitChord(chord: string): { root: string; quality: string; bass?: string } | null {
  // root: nota latina (1-3 letras + opt #/b) o inglesa (1 letra + opt #/b)
  const m = chord.match(
    /^(Do#|Do|Re#|Re|Mib|Mi|Fa#|Fa|Sol#|Sol|Lab|La#|La|Sib|Si|Reb|Solb|[A-G][#b]?)(.*?)(?:\/(Do#|Do|Re#|Re|Mib|Mi|Fa#|Fa|Sol#|Sol|Lab|La#|La|Sib|Si|Reb|Solb|[A-G][#b]?))?$/
  );
  if (!m) return null;
  return { root: m[1], quality: m[2] ?? "", bass: m[3] };
}

function transposeNote(note: string, semitones: number): string {
  const idx = NOTE_INDEX[note];
  if (idx === undefined) return note;
  const target = ((idx + semitones) % 12 + 12) % 12;
  return isLatin(note) ? SHARP_NAMES_ES[target] : SHARP_NAMES_EN[target];
}

export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord;
  const parts = splitChord(chord);
  if (!parts) return chord;
  const root = transposeNote(parts.root, semitones);
  const bass = parts.bass ? "/" + transposeNote(parts.bass, semitones) : "";
  return root + parts.quality + bass;
}

export function transposeLine(line: ChordLine, semitones: number): ChordLine {
  if (semitones === 0) return line;
  return {
    lyrics: line.lyrics,
    chords: line.chords.map((c) => ({ chord: transposeChord(c.chord, semitones), index: c.index })),
  };
}
