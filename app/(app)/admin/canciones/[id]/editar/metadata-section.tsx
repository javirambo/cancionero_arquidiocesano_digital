"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthorOption, CategoryOption } from "@/lib/songs-admin";
import type { SongFormState } from "./song-form";
import { Accordion } from "./accordion";
import { youtubeEmbedUrl } from "@/lib/media";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case";

const NEW_AUTHOR_VALUE = "__new__";

export function MetadataSection({
  form,
  update,
  authors,
  categories,
  onAuthorCreated,
  onAuthor2Created,
}: {
  form: SongFormState;
  update: <K extends keyof SongFormState>(key: K, value: SongFormState[K]) => void;
  authors: AuthorOption[];
  categories: CategoryOption[];
  onAuthorCreated: (author: AuthorOption) => void;
  onAuthor2Created: (author: AuthorOption) => void;
}) {
  // Avisar si el link cargado no va a poder reproducirse. Se guarda igual
  // (puede servir como referencia), pero sin este aviso la canción quedaba
  // sin opción de escuchar y nadie se enteraba.
  const linkNoReproduce = useMemo(() => {
    const v = form.youtube_url.trim();
    return v !== "" && youtubeEmbedUrl(v) === null;
  }, [form.youtube_url]);

  return (
    <Accordion title="Metadatos" defaultOpen>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título *" full>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Número en cancionero">
          <NumberPicker
            value={form.number}
            onChange={(v) => update("number", v)}
          />
        </Field>

        <Field label="Tonalidad original" hint="Ej: G, Em, F#m">
          <input
            type="text"
            value={form.original_key}
            onChange={(e) => update("original_key", e.target.value)}
            className={inputClass}
          />
        </Field>

        <AuthorPicker
          label="Autor 1"
          value={form.author_id}
          authors={authors}
          onChange={(id) => update("author_id", id)}
          onAuthorCreated={onAuthorCreated}
        />

        <AuthorPicker
          label="Autor 2"
          value={form.author2_id}
          authors={authors}
          onChange={(id) => update("author2_id", id)}
          onAuthorCreated={onAuthor2Created}
        />

        <Field label="Categorías litúrgicas" hint="Pueden ser varias. Tocá para seleccionar." full>
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 && (
              <span className="text-xs normal-case text-muted-foreground">
                No hay categorías cargadas.
              </span>
            )}
            {categories.map((c) => {
              const selected = form.category_ids.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    const next = selected
                      ? form.category_ids.filter((id) => id !== c.id)
                      : [...form.category_ids, c.id];
                    update("category_ids", next);
                  }}
                  aria-pressed={selected}
                  className={
                    selected
                      ? "rounded-full border border-primary bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground"
                      : "rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
                  }
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Tempo (BPM)">
          <input
            type="number"
            value={form.tempo_bpm}
            onChange={(e) => update("tempo_bpm", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Link de YouTube / Spotify" full>
          <input
            type="url"
            value={form.youtube_url}
            onChange={(e) => update("youtube_url", e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className={inputClass}
          />
          {linkNoReproduce && (
            <p className="mt-1 text-xs text-destructive">
              Este link no se va a poder reproducir: la canción no va a mostrar
              la opción de escucharlo. Sirven los de YouTube (video, short,
              vivo o lista), YouTube Music y Spotify.
            </p>
          )}
        </Field>
      </div>
    </Accordion>
  );
}

function NumberPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function suggest() {
    setLoading(true);
    setErr(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("songs")
      .select("number")
      .not("number", "is", null)
      .order("number", { ascending: false })
      .limit(1);
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    const max = data && data.length > 0 ? Number(data[0].number) : 0;
    onChange(String(max + 1));
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={() => void suggest()}
          disabled={loading}
          className="shrink-0 rounded-full border border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-60"
        >
          {loading ? "Buscando…" : "Sugerir número"}
        </button>
      </div>
      {err && <span className="text-xs text-destructive normal-case">{err}</span>}
    </div>
  );
}

function AuthorPicker({
  label,
  value,
  authors,
  onChange,
  onAuthorCreated,
}: {
  label: string;
  value: string;
  authors: AuthorOption[];
  onChange: (id: string) => void;
  onAuthorCreated: (author: AuthorOption) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleSelectChange(v: string) {
    if (v === NEW_AUTHOR_VALUE) {
      setCreating(true);
      setErr(null);
      setNewName("");
      return;
    }
    onChange(v);
  }

  function cancel() {
    setCreating(false);
    setNewName("");
    setErr(null);
  }

  async function save() {
    const name = newName.trim();
    if (!name) {
      setErr("Ingresá un nombre.");
      return;
    }
    setSaving(true);
    setErr(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("authors")
      .insert({ name })
      .select("id, name")
      .single();
    setSaving(false);
    if (error || !data) {
      setErr(error?.message ?? "No se pudo crear el autor.");
      return;
    }
    onAuthorCreated({ id: data.id as string, name: data.name as string });
    setCreating(false);
    setNewName("");
  }

  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => handleSelectChange(e.target.value)}
        className={inputClass}
      >
        <option value="">— Sin autor —</option>
        <option value={NEW_AUTHOR_VALUE}>+ Nuevo autor…</option>
        {authors.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {creating && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-2">
          <input
            type="text"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del autor"
            className={inputClass}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded-full border border-primary bg-primary px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-full border border-border px-4 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
            >
              Cancelar
            </button>
          </div>
          {err && (
            <span className="text-xs text-destructive normal-case">{err}</span>
          )}
        </div>
      )}
    </Field>
  );
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""} normal-case`}
    >
      <span className="text-xs uppercase tracking-[0.15em] text-secondary">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
