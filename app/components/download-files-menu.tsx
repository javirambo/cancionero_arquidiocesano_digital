"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadFilename } from "@/lib/supabase/storage";
import { showsImageInline } from "@/lib/psalms";
import { DownloadIcon, FilesIcon, MusicIcon, PrinterIcon } from "./icons";

// Kinds que NO se listan como descargables, en el formato que espera el
// filtro `.not("kind","in", ...)` de PostgREST.
function excludedKinds(songTitle: string): string {
  return showsImageInline(songTitle)
    ? "(audio_mp3,audio_ogg,image)"
    : "(audio_mp3,audio_ogg)";
}

export type DownloadableFile = {
  id: string;
  kind: "score_pdf" | "audio_mp3" | "audio_ogg" | "image" | "other";
  bucket: string;
  path: string;
  label: string | null;
};

type PrintInfo = {
  slug: string;
  canPrintWithChords: boolean;
  semitones: number;
  system: "auto" | "latin" | "english";
};

type Props = {
  songId: string;
  songTitle: string;
  print: PrintInfo;
};

export function DownloadFilesMenu({ songId, songTitle, print }: Props) {
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
        // Los audios se reproducen, no se descargan. Las imágenes sí se
        // descargan (son partituras escaneadas), salvo en los salmos, donde
        // la imagen se muestra embebida bajo el título.
        .not("kind", "in", excludedKinds(songTitle))
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
  }, [open, files, songId, songTitle]);

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
          print={print}
          onPrint={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function buildPrintHref(print: PrintInfo, withChords: boolean): string {
  const params = new URLSearchParams();
  params.set("chords", withChords ? "1" : "0");
  if (print.semitones !== 0) params.set("semitones", String(print.semitones));
  if (print.system !== "auto") params.set("system", print.system);
  return `/canciones/${print.slug}/imprimir?${params.toString()}`;
}

function FilesDropdown({
  files,
  loading,
  error,
  onPick,
  print,
  onPrint,
}: {
  files: DownloadableFile[] | null;
  loading: boolean;
  error: string | null;
  onPick: (f: DownloadableFile) => void;
  print: PrintInfo;
  onPrint: () => void;
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
      {!loading && !error && (
        <ul className="py-1 text-sm">
          {files?.map((f) => (
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
                  <span className="truncate text-base text-primary">
                    {kindShortLabel(f.kind)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {f.label ?? defaultLabel(f)}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {print.canPrintWithChords && (
            <li>
              <a
                href={buildPrintHref(print, true)}
                role="menuitem"
                onClick={onPrint}
                className="flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
              >
                <span className="shrink-0 text-primary" aria-hidden="true">
                  <PrinterIcon />
                </span>
                <span className="truncate text-base text-primary">
                  Imprimir con acordes <em>#</em>
                </span>
              </a>
            </li>
          )}
          <li>
            <a
              href={buildPrintHref(print, false)}
              role="menuitem"
              onClick={onPrint}
              className="flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
            >
              <span className="shrink-0 text-primary" aria-hidden="true">
                <PrinterIcon />
              </span>
              <span className="truncate text-base text-primary">
                {print.canPrintWithChords ? "Imprimir sin acordes" : "Imprimir"}
              </span>
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}

function KindIcon({ kind }: { kind: DownloadableFile["kind"] }) {
  if (kind === "audio_mp3" || kind === "audio_ogg") return <MusicIcon />;
  return <FilesIcon />;
}

function kindShortLabel(kind: DownloadableFile["kind"]): string {
  // Una imagen acá es una partitura escaneada: en los salmos, que son el
  // otro uso de las imágenes, no llega a este menú.
  if (kind === "score_pdf" || kind === "image") return "Partitura";
  if (kind === "audio_mp3" || kind === "audio_ogg") return "Audio";
  return "Otro";
}

function defaultLabel(f: DownloadableFile): string {
  return f.path.split("/").pop() ?? f.path;
}

function filenameFor(f: DownloadableFile, songTitle: string): string {
  return downloadFilename(f.label ?? songTitle, f.path);
}

// Variante embebida (sin botón ni dropdown propio) para usar dentro de
// otro menú que ya tiene su propio sistema de vistas. Carga los archivos
// al montar y los renderiza como lista inline. onAfter: callback opcional
// tras iniciar la descarga (típicamente cierra el menú padre).
export function DownloadFilesPanel({
  songId,
  songTitle,
  print,
  onAfter,
}: {
  songId: string;
  songTitle: string;
  print: { slug: string; canPrintWithChords: boolean };
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
        // Los audios se reproducen, no se descargan. Las imágenes sí se
        // descargan (son partituras escaneadas), salvo en los salmos, donde
        // la imagen se muestra embebida bajo el título.
        .not("kind", "in", excludedKinds(songTitle))
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
  }, [songId, songTitle]);

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
  return (
    <ul className="py-1 text-sm">
      {files?.map((f) => (
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
              <span className="truncate text-base text-primary">
                {kindShortLabel(f.kind)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {f.label ?? defaultLabel(f)}
              </span>
            </span>
          </button>
        </li>
      ))}
      {print.canPrintWithChords && (
        <li>
          <a
            href={buildPrintHref(
              { ...print, semitones: 0, system: "auto" },
              true
            )}
            role="menuitem"
            onClick={() => onAfter?.()}
            className="flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
          >
            <span className="shrink-0 text-primary" aria-hidden="true">
              <PrinterIcon />
            </span>
            <span className="truncate text-base text-primary">
              Imprimir con acordes <em>#</em>
            </span>
          </a>
        </li>
      )}
      <li>
        <a
          href={buildPrintHref(
            { ...print, semitones: 0, system: "auto" },
            false
          )}
          role="menuitem"
          onClick={() => onAfter?.()}
          className="flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
        >
          <span className="shrink-0 text-primary" aria-hidden="true">
            <PrinterIcon />
          </span>
          <span className="truncate text-base text-primary">
            {print.canPrintWithChords ? "Imprimir sin acordes" : "Imprimir"}
          </span>
        </a>
      </li>
    </ul>
  );
}
