"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS, getPublicImageUrl } from "@/lib/supabase/storage";
import type { PsalmFile, ReadingRowFull, ReadingSet } from "@/lib/lecturas-admin";

const COLORS = ["verde", "rojo", "blanco", "morado", "rosa", "negro"] as const;

// Colores litúrgicos reales (dato, no tema de la app), iguales al punto de la
// lista mensual, para el círculo del selector de color.
const COLOR_HEX: Record<string, string> = {
  verde: "#2e7d32",
  rojo: "#c62828",
  blanco: "#f5f5f5",
  morado: "#6a1b9a",
  rosa: "#ec8fb5",
  negro: "#222222",
};

// Archivos del salmo (audio cantado / partitura). Van al bucket público
// `images` (URL directa, sin signed URL) bajo la carpeta `lecturas/`.
const IMAGE_EXT = ["gif", "png", "jpg", "jpeg", "webp", "avif"];
const FILE_ACCEPT =
  ".mp3,.ogg,.oga,.pdf,.gif,.png,.jpg,.jpeg,.webp,audio/mpeg,audio/ogg,application/pdf,image/*";
const FILE_HELP =
  "El tipo se detecta según el archivo. Los MP3 y OGG son audios y se reproducen con un play. " +
  "Las partituras pueden ser PDF o imágenes escaneadas, y se descargan desde el menú de la canción. " +
  "En los salmos, en cambio, la imagen se muestra debajo del título.";
const MAX_FILE_BYTES = 15 * 1024 * 1024;

// El tipo se deduce del archivo mismo (manda la extensión; el mime es respaldo).
function kindForPsalmFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
  if (ext === "mp3") return "audio_mp3";
  if (ext === "ogg" || ext === "oga") return "audio_ogg";
  if (ext === "pdf") return "score_pdf";
  if (IMAGE_EXT.includes(ext)) return `score_${ext === "jpeg" ? "jpg" : ext}`;
  const mime = file.type;
  if (mime === "application/pdf") return "score_pdf";
  if (mime === "audio/ogg") return "audio_ogg";
  if (mime.startsWith("audio/")) return "audio_mp3";
  if (mime.startsWith("image/")) return "score_png";
  return null;
}

const isAudioKind = (kind: string) => kind.startsWith("audio_");

type Romcal = { name: string; color: string | null; seasonName: string } | null;

type SectionState = { ref: string; heading: string; body: string };
type PsalmState = { ref: string; response: string; stanzas: string; files: PsalmFile[] };

type SetState = {
  id: string | null;
  reading_set: ReadingSet;
  celebration: string;
  color: string;
  liturgical_time: string;
  day_label: string;
  first_reading: SectionState;
  psalm: PsalmState;
  second_reading: SectionState;
  gospel_accl: SectionState;
  gospel: SectionState;
  locked: boolean;
};

type SectionKey = "first_reading" | "second_reading" | "gospel_accl" | "gospel";

const emptySection = (): SectionState => ({ ref: "", heading: "", body: "" });
const emptyPsalm = (): PsalmState => ({ ref: "", response: "", stanzas: "", files: [] });

function sectionToState(s: ReadingRowFull["first_reading"]): SectionState {
  return { ref: s?.ref ?? "", heading: s?.heading ?? "", body: s?.body ?? "" };
}

function psalmToState(p: ReadingRowFull["psalm"]): PsalmState {
  return {
    ref: p?.ref ?? "",
    response: p?.response ?? "",
    stanzas: (p?.stanzas ?? []).join("\n\n"),
    files: p?.files ?? [],
  };
}

function rowToState(row: ReadingRowFull): SetState {
  return {
    id: row.id,
    reading_set: row.reading_set,
    celebration: row.celebration ?? "",
    color: row.color ?? "",
    liturgical_time: row.liturgical_time ?? "",
    day_label: row.day_label ?? "",
    first_reading: sectionToState(row.first_reading),
    psalm: psalmToState(row.psalm),
    second_reading: sectionToState(row.second_reading),
    gospel_accl: sectionToState(row.gospel_accl),
    gospel: sectionToState(row.gospel),
    locked: row.locked,
  };
}

// Fila nueva. Para la principal de un día sin lecturas, precargamos nombre,
// color y tiempo desde romcal para no arrancar de cero. Nueva = bloqueada.
function blankSet(reading_set: ReadingSet, romcal: Romcal): SetState {
  const pre = reading_set === "principal" && romcal;
  return {
    id: null,
    reading_set,
    celebration: pre ? romcal.name : "",
    color: pre ? romcal.color ?? "" : "",
    liturgical_time: pre ? romcal.seasonName : "",
    day_label: "",
    first_reading: emptySection(),
    psalm: emptyPsalm(),
    second_reading: emptySection(),
    gospel_accl: emptySection(),
    gospel: emptySection(),
    locked: true,
  };
}

function sectionToJson(s: SectionState) {
  if (!s.ref.trim() && !s.heading.trim() && !s.body.trim()) return null;
  return { ref: s.ref.trim() || null, heading: s.heading.trim() || null, body: s.body };
}

function psalmToJson(p: PsalmState) {
  const stanzas = p.stanzas.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  if (!p.ref.trim() && !p.response.trim() && stanzas.length === 0 && p.files.length === 0) {
    return null;
  }
  return {
    ref: p.ref.trim() || null,
    response: p.response.trim() || null,
    stanzas,
    files: p.files,
  };
}

function buildPayload(s: SetState) {
  return {
    celebration: s.celebration.trim() || null,
    color: s.color || null,
    liturgical_time: s.liturgical_time.trim() || null,
    day_label: s.day_label.trim() || null,
    first_reading: sectionToJson(s.first_reading),
    psalm: psalmToJson(s.psalm),
    second_reading: sectionToJson(s.second_reading),
    gospel_accl: sectionToJson(s.gospel_accl),
    gospel: sectionToJson(s.gospel),
    locked: s.locked,
  };
}

function isEmptySet(s: SetState): boolean {
  const p = buildPayload(s);
  return (
    !p.celebration && !p.color && !p.liturgical_time && !p.day_label &&
    !p.first_reading && !p.psalm && !p.second_reading && !p.gospel_accl && !p.gospel
  );
}

export function LecturasForm({
  date,
  rows,
  romcal,
}: {
  date: string;
  rows: ReadingRowFull[];
  romcal: Romcal;
}) {
  const router = useRouter();
  const principalRow = rows.find((r) => r.reading_set === "principal");
  const memoriaRow = rows.find((r) => r.reading_set === "memoria");

  const [sets, setSets] = useState<SetState[]>(() => {
    const initial: SetState[] = [
      principalRow ? rowToState(principalRow) : blankSet("principal", romcal),
    ];
    if (memoriaRow) initial.push(rowToState(memoriaRow));
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  // Para limpiar Storage al guardar: los archivos que había al abrir + los
  // subidos en esta sesión. Al guardar se borran los que ya no estén en ningún salmo.
  const sessionUploaded = useRef<Set<string>>(new Set());
  const initialPaths = useRef<Set<string>>(
    new Set(rows.flatMap((r) => (r.psalm?.files ?? []).map((f) => f.path)))
  );

  const backHref = `/admin/lecturas?mes=${date.slice(0, 7)}`;
  const hasMemoria = sets.some((s) => s.reading_set === "memoria");

  function patchSet(i: number, patch: Partial<SetState>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function patchSection(i: number, key: SectionKey, patch: Partial<SectionState>) {
    setSets((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [key]: { ...s[key], ...patch } } : s))
    );
  }
  function patchPsalm(i: number, patch: Partial<PsalmState>) {
    setSets((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, psalm: { ...s.psalm, ...patch } } : s))
    );
  }

  async function handleUploadPsalmFile(i: number, file: File) {
    setFileError(null);
    const kind = kindForPsalmFile(file);
    if (!kind) {
      setFileError("Formato no soportado. Audio (MP3/OGG) o partitura (PDF/GIF/PNG/JPG/WEBP).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("El archivo supera los 15 MB.");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    const path = `lecturas/${crypto.randomUUID()}${ext ? "." + ext : ""}`;
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKETS.images)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    setUploading(false);
    if (upErr) {
      setFileError(`No se pudo subir: ${upErr.message}`);
      return;
    }
    sessionUploaded.current.add(path);
    setSets((prev) =>
      prev.map((s, idx) =>
        idx === i ? { ...s, psalm: { ...s.psalm, files: [...s.psalm.files, { kind, path }] } } : s
      )
    );
  }

  // Se quita de la lista; el archivo en Storage se borra recién al Guardar (así
  // Cancelar no deja referencias rotas en la base).
  function handleRemovePsalmFile(i: number, path: string) {
    const file = sets[i]?.psalm.files.find((f) => f.path === path);
    const tipo = file && isAudioKind(file.kind) ? "audio" : "partitura";
    if (!window.confirm(`¿Quitar el archivo de ${tipo} del salmo?`)) return;
    setSets((prev) =>
      prev.map((s, idx) =>
        idx === i
          ? { ...s, psalm: { ...s.psalm, files: s.psalm.files.filter((f) => f.path !== path) } }
          : s
      )
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    for (const s of sets) {
      const payload = buildPayload(s);
      if (s.id) {
        const { error: upErr } = await supabase
          .from("liturgical_readings")
          .update(payload)
          .eq("id", s.id);
        if (upErr) {
          setError(upErr.message);
          setSaving(false);
          return;
        }
      } else if (!isEmptySet(s)) {
        const { error: insErr } = await supabase.from("liturgical_readings").insert({
          event_date: date,
          reading_set: s.reading_set,
          source_url: "manual",
          ...payload,
        });
        if (insErr) {
          setError(
            insErr.code === "23505"
              ? `Ya existe una fila "${s.reading_set}" para este día.`
              : insErr.message
          );
          setSaving(false);
          return;
        }
      }
    }
    // Limpieza de Storage: borra los archivos que quedaron fuera del set final
    // (los que el usuario quitó y los subidos en esta sesión que no persistieron).
    const finalPaths = new Set(sets.flatMap((s) => s.psalm.files.map((f) => f.path)));
    const toDelete = [...initialPaths.current, ...sessionUploaded.current].filter(
      (p) => !finalPaths.has(p)
    );
    if (toDelete.length > 0) {
      await supabase.storage.from(STORAGE_BUCKETS.images).remove([...new Set(toDelete)]);
    }

    router.push(backHref);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {sets.map((s, i) => (
        <section key={s.reading_set} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg text-page-title">
              {s.reading_set === "principal" ? "Lecturas (principal)" : "Lecturas de la memoria"}
            </h2>
            <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground normal-case">
              <input
                type="checkbox"
                checked={s.locked}
                onChange={(e) => patchSet(i, { locked: e.target.checked })}
              />
              Bloqueada (no la pisa la ingesta anual)
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Celebración">
              <input
                type="text"
                value={s.celebration}
                onChange={(e) => patchSet(i, { celebration: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Color">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-6 w-6 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: s.color ? COLOR_HEX[s.color] : "transparent" }}
                />
                <select
                  value={s.color}
                  onChange={(e) => patchSet(i, { color: e.target.value })}
                  className={inputClass}
                >
                  <option value="">— sin color —</option>
                  {COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Tiempo litúrgico">
              <input
                type="text"
                value={s.liturgical_time}
                onChange={(e) => patchSet(i, { liturgical_time: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Subtítulo del día">
              <input
                type="text"
                value={s.day_label}
                onChange={(e) => patchSet(i, { day_label: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          <SeccionEditor
            titulo="Primera lectura"
            value={s.first_reading}
            onChange={(patch) => patchSection(i, "first_reading", patch)}
          />
          <SalmoEditor
            value={s.psalm}
            onChange={(patch) => patchPsalm(i, patch)}
            onUpload={(file) => handleUploadPsalmFile(i, file)}
            onRemoveFile={(path) => handleRemovePsalmFile(i, path)}
            uploading={uploading}
          />
          <SeccionEditor
            titulo="Segunda lectura (opcional)"
            value={s.second_reading}
            onChange={(patch) => patchSection(i, "second_reading", patch)}
          />
          <SeccionEditor
            titulo="Aleluya / aclamación"
            value={s.gospel_accl}
            onChange={(patch) => patchSection(i, "gospel_accl", patch)}
          />
          <SeccionEditor
            titulo="Evangelio"
            value={s.gospel}
            onChange={(patch) => patchSection(i, "gospel", patch)}
          />
        </section>
      ))}

      {!hasMemoria && (
        <button
          type="button"
          onClick={() => setSets((prev) => [...prev, blankSet("memoria", romcal)])}
          className="self-start rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
        >
          + Agregar lecturas de la memoria
        </button>
      )}

      {fileError && <p className="text-sm normal-case text-destructive">{fileError}</p>}
      {error && <p className="text-sm normal-case text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full border border-primary bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="rounded-full border border-border px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 normal-case">
      <span className="text-xs uppercase tracking-[0.15em] text-secondary">{label}</span>
      {children}
    </label>
  );
}

function SeccionEditor({
  titulo,
  value,
  onChange,
}: {
  titulo: string;
  value: SectionState;
  onChange: (patch: Partial<SectionState>) => void;
}) {
  return (
    <fieldset className="rounded-lg border border-border p-3">
      <legend className="px-1 text-xs uppercase tracking-wide text-secondary">{titulo}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Cita (ej. Jn 1, 1-18)"
          value={value.ref}
          onChange={(e) => onChange({ ref: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Encabezado (ej. Lectura del libro de los Números)"
          value={value.heading}
          onChange={(e) => onChange({ heading: e.target.value })}
          className={inputClass}
        />
      </div>
      <textarea
        placeholder="Texto de la lectura"
        value={value.body}
        onChange={(e) => onChange({ body: e.target.value })}
        rows={4}
        className={`${inputClass} mt-2`}
      />
    </fieldset>
  );
}

function SalmoEditor({
  value,
  onChange,
  onUpload,
  onRemoveFile,
  uploading,
}: {
  value: PsalmState;
  onChange: (patch: Partial<PsalmState>) => void;
  onUpload: (file: File) => void;
  onRemoveFile: (path: string) => void;
  uploading: boolean;
}) {
  return (
    <fieldset className="rounded-lg border border-border p-3">
      <legend className="px-1 text-xs uppercase tracking-wide text-secondary">Salmo</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Cita (ej. Sal 66, 2-3)"
          value={value.ref}
          onChange={(e) => onChange({ ref: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Respuesta (estribillo)"
          value={value.response}
          onChange={(e) => onChange({ response: e.target.value })}
          className={inputClass}
        />
      </div>
      <textarea
        placeholder="Estrofas — una por bloque, separadas por una línea en blanco"
        value={value.stanzas}
        onChange={(e) => onChange({ stanzas: e.target.value })}
        rows={5}
        className={`${inputClass} mt-2`}
      />

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wide text-secondary">
            Archivos del salmo
          </span>
          <label
            className={`inline-flex cursor-pointer items-center rounded-full border border-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground ${
              uploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <input
              type="file"
              accept={FILE_ACCEPT}
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onUpload(f);
              }}
              className="hidden"
            />
            {uploading ? "Subiendo…" : "Subir Archivo"}
          </label>
        </div>
        <p className="text-[10px] leading-4 text-muted-foreground normal-case">{FILE_HELP}</p>
        {value.files.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {value.files.map((f) => (
              <FileRow key={f.path} file={f} onRemove={() => onRemoveFile(f.path)} />
            ))}
          </ul>
        )}
      </div>
    </fieldset>
  );
}

// "audio_mp3" → "Audio MP3", "score_gif" → "Imagen GIF", "score_pdf" → "Partitura PDF".
function kindLabel(kind: string): string {
  const [type, ext = ""] = kind.split("_");
  const e = ext.toUpperCase();
  if (type === "audio") return `Audio ${e}`;
  if (ext === "pdf") return `Partitura ${e}`;
  return `Imagen ${e}`;
}

function FileRow({ file, onRemove }: { file: PsalmFile; onRemove: () => void }) {
  const url = getPublicImageUrl(file.path);
  const audio = isAudioKind(file.kind);
  const isPdf = file.kind === "score_pdf";
  const isImage = !audio && !isPdf;
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      {audio ? (
        <AudioButton url={url} label={kindLabel(file.kind)} />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-sm text-foreground normal-case">
            {kindLabel(file.kind)}
          </span>
          {isImage && <ImagePreviewButton url={url} />}
          {isPdf && (
            <a
              href={url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ver"
              title="Ver"
              className="shrink-0 text-primary hover:opacity-70"
            >
              <EyeIcon />
            </a>
          )}
        </>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Eliminar"
        title="Eliminar"
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <TrashIcon />
      </button>
    </li>
  );
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Reproduce el audio inline. Al darle play el ícono pasa a pausa y aparece una
// barra de progreso para mover el punto de reproducción.
function AudioButton({ url, label }: { url: string | null; label: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
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
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {started ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
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
        </div>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm text-foreground normal-case">
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar" : "Escuchar"}
        title={playing ? "Pausar" : "Escuchar"}
        className="shrink-0 text-primary hover:opacity-70"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      {url && (
        <audio
          ref={ref}
          src={url}
          preload="none"
          onPlay={() => {
            setPlaying(true);
            setStarted(true);
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
      )}
    </div>
  );
}

// Muestra la imagen en un popup con el fondo blureado; un click afuera cierra.
function ImagePreviewButton({ url }: { url: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ver"
        title="Ver"
        className="shrink-0 text-primary hover:opacity-70"
      >
        <EyeIcon />
      </button>
      {open && url && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Partitura"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
