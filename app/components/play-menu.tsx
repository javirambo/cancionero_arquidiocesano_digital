"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { YoutubeIcon, MusicIcon } from "./icons";

type AudioKind = "audio_mp3" | "audio_ogg";

type AudioFile = {
  id: string;
  kind: AudioKind;
  bucket: string;
  path: string;
  label: string | null;
};

type Selection =
  | { type: "youtube" }
  | { type: "audio"; src: string; label: string };

type Props = {
  songId: string;
  songTitle: string;
  youtubeEmbed: string | null;
  hasFiles: boolean;
  selection: Selection | null;
  onSelect: (s: Selection | null) => void;
};

export function PlayMenu({
  songId,
  songTitle,
  youtubeEmbed,
  hasFiles,
  selection,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [audios, setAudios] = useState<AudioFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const hasYoutube = Boolean(youtubeEmbed);

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

  async function loadAudios(): Promise<AudioFile[]> {
    if (audios !== null) return audios;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("song_files")
      .select("id, kind, bucket, path, label")
      .eq("song_id", songId)
      .in("kind", ["audio_mp3", "audio_ogg"])
      .order("created_at", { ascending: false });
    setLoading(false);
    if (err) {
      console.error("play-menu: error cargando audios", err);
      setError(`No se pudieron cargar los audios: ${err.message}`);
      return [];
    }
    const list = (data ?? []) as AudioFile[];
    setAudios(list);
    return list;
  }

  async function pickAudio(file: AudioFile) {
    const supabase = createClient();
    const { data, error: err } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 3600);
    if (err || !data?.signedUrl) {
      setError("No se pudo generar el enlace. Reintentá.");
      return;
    }
    onSelect({
      type: "audio",
      src: data.signedUrl,
      label: file.label ?? defaultLabel(file),
    });
    setOpen(false);
  }

  async function handleClick() {
    // Si ya hay algo reproduciéndose, el botón apaga.
    if (selection) {
      onSelect(null);
      return;
    }

    // Solo YouTube → directo.
    if (hasYoutube && !hasFiles) {
      onSelect({ type: "youtube" });
      return;
    }

    // Hay archivos → cargar audios y decidir.
    if (hasFiles) {
      const list = await loadAudios();
      const onlyAudio = list.length > 0 && !hasYoutube;
      const noAudio = list.length === 0 && hasYoutube;
      if (onlyAudio && list.length === 1) {
        await pickAudio(list[0]);
        return;
      }
      if (noAudio) {
        onSelect({ type: "youtube" });
        return;
      }
      // Múltiples opciones (varios audios, o YouTube + audio): abrir menú.
      setOpen(true);
    }
  }

  if (!hasYoutube && !hasFiles) return null;

  const isActive = selection !== null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isActive}
        aria-expanded={open}
        aria-label={isActive ? "Detener reproducción" : "Reproducir"}
        title={isActive ? "Detener reproducción" : "Reproducir"}
        className={`flex h-10 w-10 items-center justify-center rounded-full border border-primary transition-colors [&_svg]:h-6 [&_svg]:w-6 ${
          isActive
            ? "bg-primary text-white hover:bg-primary-hover"
            : "text-primary hover:bg-primary hover:text-white"
        }`}
      >
        <YoutubeIcon />
      </button>
      {open && (
        <PlayDropdown
          hasYoutube={hasYoutube}
          audios={audios}
          loading={loading}
          error={error}
          onPickYoutube={() => {
            onSelect({ type: "youtube" });
            setOpen(false);
          }}
          onPickAudio={pickAudio}
          songTitle={songTitle}
        />
      )}
    </div>
  );
}

function PlayDropdown({
  hasYoutube,
  audios,
  loading,
  error,
  onPickYoutube,
  onPickAudio,
  songTitle: _songTitle,
}: {
  hasYoutube: boolean;
  audios: AudioFile[] | null;
  loading: boolean;
  error: string | null;
  onPickYoutube: () => void;
  onPickAudio: (f: AudioFile) => void;
  songTitle: string;
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
          {hasYoutube && (
            <li>
              <button
                type="button"
                role="menuitem"
                onClick={onPickYoutube}
                className="flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
              >
                <span className="shrink-0 text-primary" aria-hidden="true">
                  <YoutubeIcon />
                </span>
                <span className="truncate text-base text-primary">YouTube</span>
              </button>
            </li>
          )}
          {audios?.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                role="menuitem"
                onClick={() => onPickAudio(f)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left normal-case text-foreground transition-colors hover:bg-sidebar"
              >
                <span className="shrink-0 text-primary" aria-hidden="true">
                  <MusicIcon />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-base text-primary">Audio</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {f.label ?? defaultLabel(f)}
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

function defaultLabel(f: AudioFile): string {
  return f.path.split("/").pop() ?? f.path;
}
