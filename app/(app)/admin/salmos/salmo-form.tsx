"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useUnsavedChanges } from "@/app/components/unsaved-changes-context";
import { HelpHint } from "@/app/components/help-hint";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS, getPublicImageUrl } from "@/lib/supabase/storage";
import { normalizeResponse, type SalmoMedia } from "@/lib/salmos";
import type { SalmoRow } from "@/lib/salmos-admin";

const AUDIO_ACCEPT = ".mp3,.ogg,.oga,audio/mpeg,audio/ogg";
const SCORE_ACCEPT = ".pdf,.gif,.png,.jpg,.jpeg,.webp,application/pdf,image/*";
const MAX_BYTES = 15 * 1024 * 1024;

// Ayuda reutilizable: cómo escribir la referencia bíblica (salmos.ref).
function RefHelp() {
  return (
    <HelpHint label="Cómo escribir la cita del salmo">
      <p className="mb-1 font-semibold text-foreground">Referencia bíblica del salmo</p>
      <p>
        Ejemplo: <code className="rounded bg-sidebar px-1">Sal 80, 3-6.10-11</code>
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
        <li>Nº de salmo + coma + los versículos.</li>
        <li>
          <b>-</b> (guion): rango. <code className="rounded bg-sidebar px-1">3-6</code> = del 3 al 6.
        </li>
        <li>
          <b>.</b> (punto): separa tramos.{" "}
          <code className="rounded bg-sidebar px-1">3-6.10-11</code> = 3 a 6 y 10 a 11.
        </li>
      </ul>
    </HelpHint>
  );
}

// Ayuda reutilizable: qué es la antífona y para qué se usa.
function ResponseHelp() {
  return (
    <HelpHint label="Qué es la antífona">
      <p>
        Es la respuesta o estribillo que repite la asamblea. Junto al nº de salmo, se usa para
        vincular este salmo con las fechas de lecturas (vínculo <b>automágico</b>).
      </p>
    </HelpHint>
  );
}

export function SalmoForm({ mode, salmo }: { mode: "create" | "edit"; salmo?: SalmoRow }) {
  const router = useRouter();
  const [psalmNumber, setPsalmNumber] = useState(salmo ? String(salmo.psalm_number) : "");
  const [response, setResponse] = useState(salmo?.response ?? "");
  const [ref, setRef] = useState(salmo?.ref ?? "");
  const [audios, setAudios] = useState<SalmoMedia[]>(salmo?.audios ?? []);
  const [scores, setScores] = useState<SalmoMedia[]>(salmo?.scores ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialPaths = useRef<string[]>(
    [...(salmo?.audios ?? []), ...(salmo?.scores ?? [])].map((m) => m.path)
  );
  const sessionUploaded = useRef<Set<string>>(new Set());

  const backHref = "/admin/salmos";

  const dirty =
    psalmNumber !== (salmo ? String(salmo.psalm_number) : "") ||
    response !== (salmo?.response ?? "") ||
    ref !== (salmo?.ref ?? "") ||
    JSON.stringify(audios) !== JSON.stringify(salmo?.audios ?? []) ||
    JSON.stringify(scores) !== JSON.stringify(salmo?.scores ?? []);

  // Reportar a la botonera si hay cambios sin guardar (para confirmar al salir).
  const { setDirty } = useUnsavedChanges();
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);

  async function uploadFile(file: File): Promise<string | null> {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("El archivo supera los 15 MB.");
      return null;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    const path = `salmos/${crypto.randomUUID()}${ext ? "." + ext : ""}`;
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKETS.images)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    setUploading(false);
    if (upErr) {
      setError(`No se pudo subir: ${upErr.message}`);
      return null;
    }
    sessionUploaded.current.add(path);
    return path;
  }

  async function addAudio(file: File) {
    const p = await uploadFile(file);
    if (p) setAudios((a) => [...a, { label: `Versión ${a.length + 1}`, path: p }]);
  }
  async function addScore(file: File) {
    const p = await uploadFile(file);
    if (p) setScores((s) => [...s, { label: s.length === 0 ? "Simple" : "SATB", path: p }]);
  }
  async function replaceAudio(i: number, file: File) {
    const p = await uploadFile(file);
    if (p) setAudios((a) => a.map((x, idx) => (idx === i ? { ...x, path: p } : x)));
  }
  async function replaceScore(i: number, file: File) {
    const p = await uploadFile(file);
    if (p) setScores((s) => s.map((x, idx) => (idx === i ? { ...x, path: p } : x)));
  }
  function removeAudio(i: number) {
    if (!window.confirm("¿Quitar este audio del salmo?")) return;
    setAudios((a) => a.filter((_, idx) => idx !== i));
  }
  function removeScore(i: number) {
    if (!window.confirm("¿Quitar esta partitura del salmo?")) return;
    setScores((s) => s.filter((_, idx) => idx !== i));
  }
  const labelAudio = (i: number, label: string) =>
    setAudios((a) => a.map((x, idx) => (idx === i ? { ...x, label } : x)));
  const labelScore = (i: number, label: string) =>
    setScores((s) => s.map((x, idx) => (idx === i ? { ...x, label } : x)));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const num = parseInt(psalmNumber, 10);
    if (!Number.isFinite(num) || num < 1) {
      setError("Número de salmo inválido.");
      return;
    }
    if (!response.trim()) {
      setError("La antífona es obligatoria.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const values = {
      psalm_number: num,
      response: response.trim(),
      response_norm: normalizeResponse(response),
      ref: ref.trim() || null,
      audios,
      scores,
    };
    const { error: opErr } =
      mode === "create"
        ? await supabase.from("salmos").insert({ ...values, source: "manual" })
        : await supabase.from("salmos").update(values).eq("id", salmo!.id);
    if (opErr) {
      setError(
        opErr.code === "23505" ? "Ya existe un salmo con ese número y antífona." : opErr.message
      );
      setSaving(false);
      return;
    }
    const finalPaths = new Set([...audios, ...scores].map((m) => m.path));
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
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nº de salmo">
          <input
            type="number"
            min={1}
            value={psalmNumber}
            onChange={(e) => setPsalmNumber(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Cita (ref)" help={<RefHelp />}>
          <input
            type="text"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Sal 1, 1-4.6"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Antífona (respuesta)" help={<ResponseHelp />}>
        <input
          type="text"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          className={inputClass}
        />
      </Field>

      <MediaList
        title="Partituras"
        kind="score"
        items={scores}
        accept={SCORE_ACCEPT}
        uploading={uploading}
        addLabel="Agregar partitura"
        onAdd={addScore}
        onReplace={replaceScore}
        onRemove={removeScore}
        onLabel={labelScore}
        hint="Imagen PNG/JPG/WEBP. Se muestra al ancho de la ficha, conviene buena resolución (ancho ≥ 1000 px). Máximo 15 MB."
      />

      <MediaList
        title="Audios"
        kind="audio"
        items={audios}
        accept={AUDIO_ACCEPT}
        uploading={uploading}
        addLabel="Agregar audio"
        onAdd={addAudio}
        onReplace={replaceAudio}
        onRemove={removeAudio}
        onLabel={labelAudio}
      />

      {error && <p className="text-sm normal-case text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving || uploading || !dirty}
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

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 normal-case">
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-secondary">
        {label}
        {help}
      </span>
      {children}
    </label>
  );
}

function MediaList({
  title,
  kind,
  items,
  accept,
  uploading,
  addLabel,
  onAdd,
  onReplace,
  onRemove,
  onLabel,
  hint,
}: {
  title: string;
  kind: "audio" | "score";
  items: SalmoMedia[];
  accept: string;
  uploading: boolean;
  addLabel: string;
  onAdd: (file: File) => void;
  onReplace: (i: number, file: File) => void;
  onRemove: (i: number) => void;
  onLabel: (i: number, label: string) => void;
  hint?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <span className="text-xs uppercase tracking-[0.15em] text-secondary">{title}</span>
      {items.map((m, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
          {kind === "score" ? (
            <ScorePreview path={m.path} />
          ) : (
            <AudioPlayer url={getPublicImageUrl(m.path)} />
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={m.label}
              onChange={(e) => onLabel(i, e.target.value)}
              placeholder={kind === "audio" ? "Etiqueta (Versión 1…)" : "Etiqueta (Simple / SATB)"}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1 text-xs normal-case"
            />
            <MediaButtons
              accept={accept}
              uploading={uploading}
              onUpload={(f) => onReplace(i, f)}
              onRemove={() => onRemove(i)}
            />
          </div>
        </div>
      ))}
      <UploadButton label={addLabel} accept={accept} uploading={uploading} onUpload={onAdd} />
      {hint && <p className="text-[11px] normal-case text-muted-foreground">{hint}</p>}
    </section>
  );
}

function ScorePreview({ path }: { path: string }) {
  const url = getPublicImageUrl(path);
  if (path.toLowerCase().endsWith(".pdf")) {
    return (
      <a
        href={url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary hover:underline"
      >
        Ver PDF de la partitura
      </a>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={url ?? ""} alt="Partitura" className="w-full rounded-lg border border-border bg-card" />
  );
}

// Reemplazar (primary) + Eliminar (rojo), chicos y a la derecha.
function MediaButtons({
  accept,
  uploading,
  onUpload,
  onRemove,
}: {
  accept: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <label
        className={`cursor-pointer rounded-full border border-primary px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground ${
          uploading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <input
          type="file"
          accept={accept}
          disabled={uploading}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onUpload(f);
          }}
        />
        Reemplazar
      </label>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full border border-destructive px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-destructive hover:bg-destructive hover:text-destructive-foreground"
      >
        Eliminar
      </button>
    </div>
  );
}

function UploadButton({
  label,
  accept,
  uploading,
  onUpload,
}: {
  label: string;
  accept: string;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <label
      className={`inline-flex w-fit cursor-pointer items-center rounded-full border border-primary px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground ${
        uploading ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <input
        type="file"
        accept={accept}
        disabled={uploading}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onUpload(f);
        }}
      />
      {uploading ? "Subiendo…" : `+ ${label}`}
    </label>
  );
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Player con play/pausa + barra de tiempo siempre visible.
function AudioPlayer({ url }: { url: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else void el.play();
  }
  function seek(v: number) {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = v;
    setCurrent(v);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pausar" : "Escuchar"}
        title={playing ? "Pausar" : "Escuchar"}
        className="shrink-0 text-primary hover:opacity-70"
      >
        {playing ? <PauseIconBig /> : <PlayIconBig />}
      </button>
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
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={(e) => {
            document.querySelectorAll("audio").forEach((a) => a !== e.currentTarget && a.pause());
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrent(0);
            if (audioRef.current) audioRef.current.currentTime = 0;
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />
      )}
    </div>
  );
}

function PlayIconBig() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIconBig() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
