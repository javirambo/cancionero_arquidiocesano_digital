"use client";

import { useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKETS } from "@/lib/supabase/storage";
import type { AdminSongFile } from "@/lib/songs-admin";
import { Accordion } from "./accordion";

type FileKind = AdminSongFile["kind"];

const kindLabel: Record<FileKind, string> = {
  score_pdf: "Partitura (PDF)",
  audio_mp3: "Audio MP3",
  audio_ogg: "Audio OGG",
  other: "Otro",
};

function bucketForKind(kind: FileKind): string {
  if (kind === "score_pdf") return STORAGE_BUCKETS.partituras;
  if (kind === "audio_mp3" || kind === "audio_ogg") return STORAGE_BUCKETS.audios;
  return STORAGE_BUCKETS.partituras;
}

function detectKind(file: File): FileKind {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "score_pdf";
  if (name.endsWith(".mp3")) return "audio_mp3";
  if (name.endsWith(".ogg") || name.endsWith(".oga")) return "audio_ogg";
  return "other";
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesSection({
  songId,
  initialFiles,
}: {
  songId: string;
  initialFiles: AdminSongFile[];
}) {
  const [files, setFiles] = useState<AdminSongFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();

    const kind = detectKind(file);
    const bucket = bucketForKind(kind);
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
    const path = `${songId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${ext ? "." + ext : ""}`;

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (upErr) {
      setUploading(false);
      setError(`No se pudo subir: ${upErr.message}`);
      return;
    }

    const { data: inserted, error: insErr } = await supabase
      .from("song_files")
      .insert({
        song_id: songId,
        kind,
        bucket,
        path,
        label: label.trim() || null,
        size_bytes: file.size,
      })
      .select(
        "id, song_id, kind, bucket, path, label, is_primary, size_bytes, status, created_at"
      )
      .single();

    if (insErr) {
      // Rollback del archivo en Storage para no dejar huérfanos.
      await supabase.storage.from(bucket).remove([path]);
      setUploading(false);
      setError(`No se pudo registrar el archivo: ${insErr.message}`);
      return;
    }

    setFiles((prev) => [inserted as AdminSongFile, ...prev]);
    setLabel("");
    setUploading(false);
  }

  async function handleDelete(f: AdminSongFile) {
    if (!window.confirm(`¿Eliminar el archivo "${f.label ?? f.path}"?`)) return;
    setError(null);
    const supabase = createClient();
    const { error: delErr } = await supabase
      .from("song_files")
      .delete()
      .eq("id", f.id);
    if (delErr) {
      setError(`No se pudo eliminar el registro: ${delErr.message}`);
      return;
    }
    await supabase.storage.from(f.bucket).remove([f.path]);
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
  }

  return (
    <Accordion title="Archivos (partituras y audios)" defaultOpen={false}>
      <div className="flex flex-col gap-4 normal-case">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.15em] text-secondary">
              Etiqueta (opcional)
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: partitura completa"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case"
            />
          </label>
          <label
            className={`inline-flex cursor-pointer items-center justify-center rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              type="file"
              accept=".pdf,.mp3,.ogg,.oga,application/pdf,audio/mpeg,audio/ogg"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            {uploading ? "Subiendo…" : "+ Subir archivo"}
          </label>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {files.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Esta canción todavía no tiene archivos.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {files.map((f) => {
              const filename = f.path.split("/").pop() ?? f.path;
              return (
                <li
                  key={f.id}
                  className="flex flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center sm:gap-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm text-primary">
                      {f.label ?? filename}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {kindLabel[f.kind]}
                      {f.size_bytes ? ` · ${formatSize(f.size_bytes)}` : ""}
                      {" · "}
                      {f.status === "published" ? "Publicado" : "Borrador"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(f)}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-destructive hover:text-destructive"
                  >
                    Eliminar
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Accordion>
  );
}
