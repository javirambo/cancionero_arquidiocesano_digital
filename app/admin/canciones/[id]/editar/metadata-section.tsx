"use client";

import type { AuthorOption, CategoryOption } from "@/lib/songs-admin";
import type { SongFormState } from "./song-form";
import { Accordion } from "./accordion";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case";

export function MetadataSection({
  form,
  update,
  authors,
  categories,
}: {
  form: SongFormState;
  update: <K extends keyof SongFormState>(key: K, value: SongFormState[K]) => void;
  authors: AuthorOption[];
  categories: CategoryOption[];
}) {
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
          <input
            type="number"
            value={form.number}
            onChange={(e) => update("number", e.target.value)}
            className={inputClass}
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

        <Field label="Autor">
          <select
            value={form.author_id}
            onChange={(e) => update("author_id", e.target.value)}
            className={inputClass}
          >
            <option value="">— Sin autor —</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Categoría litúrgica">
          <select
            value={form.category_id}
            onChange={(e) => update("category_id", e.target.value)}
            className={inputClass}
          >
            <option value="">— Sin categoría —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tempo (BPM)">
          <input
            type="number"
            value={form.tempo_bpm}
            onChange={(e) => update("tempo_bpm", e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Link de YouTube" full>
          <input
            type="url"
            value={form.youtube_url}
            onChange={(e) => update("youtube_url", e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className={inputClass}
          />
        </Field>

        <Field label="Etiquetas" hint="Separadas por coma" full>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => update("tags", e.target.value)}
            placeholder="adoración, mariana, …"
            className={inputClass}
          />
        </Field>
      </div>
    </Accordion>
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
