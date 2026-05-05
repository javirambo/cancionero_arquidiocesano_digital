"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DownloadIcon, FilesIcon, MusicIcon } from "./icons";

export type DownloadableFile = {
  id: string;
  kind: "score_pdf" | "audio_mp3" | "audio_ogg" | "other";
  bucket: string;
  path: string;
  label: string | null;
};

type Props = {
  songId: string;
  songTitle: string;
};

export function DownloadFilesMenu({ songId, songTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<DownloadableFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || files !== null) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("song_files")
        .select("id, kind, bucket, path, label")
        .eq("song_id", songId)
        .order("kind", { ascending: true })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (err) {
        console.error("download-files-menu: error cargando archivos", err);
        setError(`No se pudieron cargar los archivos: ${err.message}`);
        setLoading(false);
        return;
      }
      setFiles((data ?? []) as DownloadableFile[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, files, songId]);

  async function handleDownload(file: DownloadableFile) {
    const supabase = createClient();
    const { data, error: err } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 60, { download: filenameFor(file, songTitle) });
    if (err || !data?.signedUrl) {
      setError("No se pudo generar el enlace. Reintentá.");
      return;
    }
    window.location.href = data.signedUrl;
    setOpen(false);
  }

  function toggle() {
    setOpen((v) => !v);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Descargar archivos"
        title="Descargar archivos"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary hover:text-white"
      >
        <DownloadIcon />
      </button>
      {open && (
        <FilesDropdown
          files={files}
          loading={loading}
          error={error}
          onPick={handleDownload}
        />
      )}
    </div>
  );
}

function FilesDropdown({
  files,
  loading,
  error,
  onPick,
}: {
  files: DownloadableFile[] | null;
  loading: boolean;
  error: string | null;
  onPick: (f: DownloadableFile) => void;
}) {
  return (
    <div
      role="menu"
      className="absolute right-0 top-12 z-40 w-72 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
    >
      {loading && (
        <p className="px-4 py-3 text-sm text-muted-foreground">Cargando…</p>
      )}
      {!loading && error && (
        <p className="px-4 py-3 text-sm text-destructive">{error}</p>
      )}
      {!loading && !error && files !== null && files.length === 0 && (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          No hay archivos disponibles.
        </p>
      )}
      {!loading && !error && files !== null && files.length > 0 && (
        <ul className="py-1 text-sm">
          {files.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                role="menuitem"
                onClick={() => onPick(f)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
              >
                <span className="shrink-0 text-primary" aria-hidden="true">
                  <KindIcon kind={f.kind} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{f.label ?? defaultLabel(f)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {kindShortLabel(f.kind)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KindIcon({ kind }: { kind: DownloadableFile["kind"] }) {
  if (kind === "score_pdf") return <FilesIcon />;
  if (kind === "audio_mp3" || kind === "audio_ogg") return <MusicIcon />;
  return <FilesIcon />;
}

function kindShortLabel(kind: DownloadableFile["kind"]): string {
  if (kind === "score_pdf") return "Partitura";
  if (kind === "audio_mp3" || kind === "audio_ogg") return "Audio";
  return "Otro";
}

function defaultLabel(f: DownloadableFile): string {
  return f.path.split("/").pop() ?? f.path;
}

function filenameFor(f: DownloadableFile, songTitle: string): string {
  const ext = f.path.includes(".") ? f.path.split(".").pop() : "";
  const base = (f.label ?? songTitle).replace(/[\\/:*?"<>|]/g, "_");
  return ext ? `${base}.${ext}` : base;
}

// Variante embebida (sin botón ni dropdown propio) para usar dentro de
// otro menú que ya tiene su propio sistema de vistas. Carga los archivos
// al montar y los renderiza como lista inline. onAfter: callback opcional
// tras iniciar la descarga (típicamente cierra el menú padre).
export function DownloadFilesPanel({
  songId,
  songTitle,
  onAfter,
}: {
  songId: string;
  songTitle: string;
  onAfter?: () => void;
}) {
  const [files, setFiles] = useState<DownloadableFile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("song_files")
        .select("id, kind, bucket, path, label")
        .eq("song_id", songId)
        .order("kind", { ascending: true })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (err) {
        console.error("download-files-panel: error cargando archivos", err);
        setError(`No se pudieron cargar los archivos: ${err.message}`);
        setLoading(false);
        return;
      }
      setFiles((data ?? []) as DownloadableFile[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [songId]);

  async function pick(file: DownloadableFile) {
    const supabase = createClient();
    const { data, error: err } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 60, { download: filenameFor(file, songTitle) });
    if (err || !data?.signedUrl) {
      setError("No se pudo generar el enlace. Reintentá.");
      return;
    }
    window.location.assign(data.signedUrl);
    onAfter?.();
  }

  if (loading) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">Cargando…</p>;
  }
  if (error) {
    return <p className="px-4 py-3 text-sm text-destructive">{error}</p>;
  }
  if (files === null || files.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        No hay archivos disponibles.
      </p>
    );
  }
  return (
    <ul className="py-1 text-sm">
      {files.map((f) => (
        <li key={f.id}>
          <button
            type="button"
            role="menuitem"
            onClick={() => pick(f)}
            className="flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
          >
            <span className="shrink-0 text-primary" aria-hidden="true">
              <KindIcon kind={f.kind} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">{f.label ?? defaultLabel(f)}</span>
              <span className="truncate text-xs text-muted-foreground">
                {kindShortLabel(f.kind)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
