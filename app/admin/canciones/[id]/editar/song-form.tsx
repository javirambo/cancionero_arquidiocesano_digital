"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  AdminSongDetail,
  AdminSongFile,
  AuthorOption,
  CategoryOption,
} from "@/lib/songs-admin";
import { MetadataSection } from "./metadata-section";
import { LyricsSection } from "./lyrics-section";
import { FilesSection } from "./files-section";

export type SongFormState = {
  title: string;
  number: string;
  author_id: string;
  category_id: string;
  youtube_url: string;
  tempo_bpm: string;
  tags: string;
  original_key: string;
  body: string;
};

function toFormState(song: AdminSongDetail): SongFormState {
  return {
    title: song.title,
    number: song.number !== null ? String(song.number) : "",
    author_id: song.author_id ?? "",
    category_id: song.category_id ?? "",
    youtube_url: song.youtube_url ?? "",
    tempo_bpm: song.tempo_bpm !== null ? String(song.tempo_bpm) : "",
    tags: song.tags.join(", "),
    original_key: song.original_key ?? "",
    body: song.body,
  };
}

export function SongForm({
  song,
  authors,
  categories,
  files,
}: {
  song: AdminSongDetail;
  authors: AuthorOption[];
  categories: CategoryOption[];
  files: AdminSongFile[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<SongFormState>(toFormState(song));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function update<K extends keyof SongFormState>(key: K, value: SongFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    setOkMsg(null);
    const supabase = createClient();

    const tagsArr = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const numberVal = form.number.trim() === "" ? null : Number(form.number);
    const tempoVal =
      form.tempo_bpm.trim() === "" ? null : Number(form.tempo_bpm);

    const payload = {
      title: form.title.trim(),
      number: numberVal,
      author_id: form.author_id || null,
      category_id: form.category_id || null,
      youtube_url: form.youtube_url.trim() || null,
      tempo_bpm: tempoVal,
      tags: tagsArr,
      original_key: form.original_key.trim() || null,
      body: form.body,
    };

    const { error } = await supabase
      .from("songs")
      .update(payload)
      .eq("id", song.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOkMsg("Cambios guardados.");
    router.push("/admin/canciones");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <MetadataSection
        form={form}
        update={update}
        authors={authors}
        categories={categories}
      />

      <LyricsSection form={form} update={update} />

      <FilesSection songId={song.id} initialFiles={files} />

      {error && (
        <p className="text-sm normal-case text-destructive">{error}</p>
      )}
      {okMsg && (
        <p className="text-sm normal-case text-secondary">{okMsg}</p>
      )}

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-border bg-background py-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full border border-primary bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/canciones")}
          className="rounded-full border border-border px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
