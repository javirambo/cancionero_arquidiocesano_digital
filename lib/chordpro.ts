// ChordPro mínimo: solo extraemos acordes en línea con el formato [Acorde]
// y los exponemos como tokens posicionados sobre la letra.
// Soporta cifrado latino (Do, Re, Mi…) e inglés (C, D, E…), con sufijos
// como m, m7, 7, maj7, sus, dim, aug, /Bajo.

export type ChordToken = { chord: string; index: number };
export type ChordLine = {
  lyrics: string;
  chords: ChordToken[];
  // true si la línea está dentro de un bloque {start_of_chorus}…{end_of_chorus}.
  inChorus?: boolean;
};

// Cada llamada crea su propia regex para evitar bugs de `lastIndex`
// compartido al reusar un regex global entre `matchAll`/`exec`/`test`.
function chordRe(): RegExp {
  return /\[([^\]]+)\]/g;
}

// Directivas ChordPro de inicio/fin de estribillo (con alias soc/eoc).
// Tolerantes a espacios y mayúsculas.
const SOC_RE = /^\s*\{\s*(?:start_of_chorus|soc)\s*\}\s*$/i;
const EOC_RE = /^\s*\{\s*(?:end_of_chorus|eoc)\s*\}\s*$/i;

export function parseLine(line: string): ChordLine {
  const chords: ChordToken[] = [];
  let lyrics = "";
  let lastEnd = 0;
  const re = chordRe();
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const matchStart = m.index;
    lyrics += line.slice(lastEnd, matchStart);
    chords.push({ chord: m[1], index: lyrics.length });
    lastEnd = matchStart + m[0].length;
  }
  lyrics += line.slice(lastEnd);
  return { lyrics, chords };
}

export function parseBody(body: string): ChordLine[] {
  const out: ChordLine[] = [];
  let inChorus = false;
  for (const raw of body.split(/\r?\n/)) {
    if (SOC_RE.test(raw)) {
      inChorus = true;
      continue;
    }
    if (EOC_RE.test(raw)) {
      inChorus = false;
      continue;
    }
    const parsed = parseLine(raw);
    if (inChorus) parsed.inChorus = true;
    out.push(parsed);
  }
  return out;
}

export function hasAnyChord(body: string): boolean {
  return chordRe().test(body);
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

export type ChordSystem = "latin" | "english" | "auto";

function transposeNote(
  note: string,
  semitones: number,
  system: ChordSystem = "auto"
): string {
  const idx = NOTE_INDEX[note];
  if (idx === undefined) return note;
  const target = ((idx + semitones) % 12 + 12) % 12;
  const useLatin =
    system === "latin" ? true : system === "english" ? false : isLatin(note);
  return useLatin ? SHARP_NAMES_ES[target] : SHARP_NAMES_EN[target];
}

export function transposeChord(
  chord: string,
  semitones: number,
  system: ChordSystem = "auto"
): string {
  // Si solo cambiamos sistema (sin transponer), igual hay que reescribir.
  const parts = splitChord(chord);
  if (!parts) return chord;
  if (semitones === 0 && system === "auto") return chord;
  const root = transposeNote(parts.root, semitones, system);
  const bass = parts.bass
    ? "/" + transposeNote(parts.bass, semitones, system)
    : "";
  return root + parts.quality + bass;
}

export function transposeLine(
  line: ChordLine,
  semitones: number,
  system: ChordSystem = "auto"
): ChordLine {
  if (semitones === 0 && system === "auto") return line;
  return {
    lyrics: line.lyrics,
    chords: line.chords.map((c) => ({
      chord: transposeChord(c.chord, semitones, system),
      index: c.index,
    })),
  };
}

// Detecta el sistema de cifrado dominante en una lista de líneas parseadas.
// Útil para inicializar el toggle en el sistema "natural" de la canción.
export function detectSystem(lines: ChordLine[]): "latin" | "english" {
  let latin = 0;
  let english = 0;
  for (const line of lines) {
    for (const c of line.chords) {
      const parts = splitChord(c.chord);
      if (!parts) continue;
      if (isLatin(parts.root)) latin++;
      else english++;
    }
  }
  // Empate o vacío → latino (más común en el cancionero litúrgico en español).
  return english > latin ? "english" : "latin";
}
