"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
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
  author2_id: string;
  category_ids: string[];
  youtube_url: string;
  tempo_bpm: string;
  original_key: string;
  body: string;
};

function toFormState(song: AdminSongDetail): SongFormState {
  return {
    title: song.title,
    number: song.number !== null ? String(song.number) : "",
    author_id: song.author_id ?? "",
    author2_id: song.author2_id ?? "",
    category_ids: [...song.category_ids],
    youtube_url: song.youtube_url ?? "",
    tempo_bpm: song.tempo_bpm !== null ? String(song.tempo_bpm) : "",
    original_key: song.original_key ?? "",
    body: song.body,
  };
}

// Slug placeholder que genera el RPC `create_blank_song` al crear una canción
// en blanco: "nueva-cancion-<timestamp>". Mientras el slug siga este patrón,
// la canción nunca recibió un slug derivado de su título real.
const PLACEHOLDER_SLUG_RE = /^nueva-cancion-\d+$/;

// Genera un slug único a partir del título, evitando colisiones con otras
// canciones (excluye la propia por id). Si "mi-canto" existe, prueba
// "mi-canto-2", "mi-canto-3", etc.
async function uniqueSlugFromTitle(
  supabase: ReturnType<typeof createClient>,
  title: string,
  selfId: string
): Promise<string> {
  const base = slugify(title) || "canto";
  const { data } = await supabase
    .from("songs")
    .select("id, slug")
    .like("slug", `${base}%`)
    .neq("id", selfId);
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
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
  const [authorOptions, setAuthorOptions] = useState<AuthorOption[]>(authors);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  function handleAuthorCreated(author: AuthorOption) {
    setAuthorOptions((prev) =>
      [...prev, author].sort((a, b) => a.name.localeCompare(b.name))
    );
    setForm((prev) => ({ ...prev, author_id: author.id }));
  }

  function handleAuthor2Created(author: AuthorOption) {
    setAuthorOptions((prev) =>
      [...prev, author].sort((a, b) => a.name.localeCompare(b.name))
    );
    setForm((prev) => ({ ...prev, author2_id: author.id }));
  }

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

    const numberVal = form.number.trim() === "" ? null : Number(form.number);
    const tempoVal =
      form.tempo_bpm.trim() === "" ? null : Number(form.tempo_bpm);
    const title = form.title.trim();

    // Si la canción todavía tiene el slug placeholder de creación
    // ("nueva-cancion-<timestamp>"), lo reemplazamos por uno derivado del
    // título real al guardar. Las canciones con slug ya personalizado no se
    // tocan para no romper URLs existentes.
    const payload: Record<string, unknown> = {
      title,
      number: numberVal,
      author_id: form.author_id || null,
      author2_id: form.author2_id || null,
      youtube_url: form.youtube_url.trim() || null,
      tempo_bpm: tempoVal,
      original_key: form.original_key.trim() || null,
      body: form.body,
    };
    if (PLACEHOLDER_SLUG_RE.test(song.slug)) {
      payload.slug = await uniqueSlugFromTitle(supabase, title, song.id);
    }

    const { error: updateErr } = await supabase
      .from("songs")
      .update(payload)
      .eq("id", song.id);

    if (updateErr) {
      setSaving(false);
      const isDuplicateNumber =
        updateErr.code === "23505" &&
        (updateErr.message?.includes("songs_number_unique") ?? false);
      if (isDuplicateNumber) {
        setError(
          `El número ${numberVal} ya está en uso por otra canción. Probá con otro o tocá "Sugerir número".`
        );
      } else {
        setError(updateErr.message);
      }
      return;
    }

    // Sincronizar categorías: comparar prev vs nuevo, borrar las que se sacaron
    // e insertar las nuevas. Evitamos delete+reinsert total para no chocar con
    // posibles triggers/auditoría.
    const prevSet = new Set(song.category_ids);
    const nextSet = new Set(form.category_ids);
    const toRemove = [...prevSet].filter((id) => !nextSet.has(id));
    const toAdd = [...nextSet].filter((id) => !prevSet.has(id));

    if (toRemove.length > 0) {
      const { error: delErr } = await supabase
        .from("song_categories")
        .delete()
        .eq("song_id", song.id)
        .in("category_id", toRemove);
      if (delErr) {
        setSaving(false);
        setError(delErr.message);
        return;
      }
    }
    if (toAdd.length > 0) {
      const { error: insErr } = await supabase
        .from("song_categories")
        .insert(toAdd.map((category_id) => ({ song_id: song.id, category_id })));
      if (insErr) {
        setSaving(false);
        setError(insErr.message);
        return;
      }
    }

    // Registramos la edición en la bitácora. Si la canción está
    // publicada, la edición directa (CU-16.1) materializa una nueva
    // versión con snapshot; en cualquier otro estado solo se deja el
    // evento 'edited' (el contenido sigue siendo mutable hasta publicar).
    const { error: logErr } =
      song.status === "published"
        ? await supabase.rpc("save_published_song_version", {
            p_song_id: song.id,
          })
        : await supabase.rpc("log_song_edit", { p_song_id: song.id });
    if (logErr) {
      setSaving(false);
      setError(logErr.message);
      return;
    }

    setSaving(false);
    setOkMsg("Cambios guardados.");
    router.push("/admin/canciones");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <MetadataSection
        form={form}
        update={update}
        authors={authorOptions}
        categories={categories}
        onAuthorCreated={handleAuthorCreated}
        onAuthor2Created={handleAuthor2Created}
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
